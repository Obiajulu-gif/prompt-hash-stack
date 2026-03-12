(use-trait sip010-ft-trait .sip010-ft-trait.sip010-ft-trait)

(define-constant asset-stx u1)
(define-constant asset-sbtc u2)
(define-constant asset-usdcx u3)

(define-constant purchase-kind-direct u1)
(define-constant purchase-kind-x402 u2)

(define-constant err-owner-only (err u100))
(define-constant err-listing-not-found (err u101))
(define-constant err-invalid-asset (err u102))
(define-constant err-invalid-price (err u103))
(define-constant err-token-contract-required (err u104))
(define-constant err-token-contract-not-allowed (err u105))
(define-constant err-not-seller (err u106))
(define-constant err-already-purchased (err u107))
(define-constant err-not-published (err u108))
(define-constant err-duplicate-payment (err u109))
(define-constant err-x402-disabled (err u110))
(define-constant err-invalid-buyer (err u111))
(define-constant err-token-contract-mismatch (err u112))
(define-constant err-asset-mismatch (err u113))
(define-constant err-self-purchase (err u114))
(define-constant err-empty-field (err u115))

(define-constant contract-owner tx-sender)

(define-data-var listing-nonce uint u0)
(define-data-var access-recorder principal tx-sender)

(define-map listings
  { listing-id: uint }
  {
    seller: principal,
    title: (string-utf8 64),
    summary: (string-utf8 256),
    metadata-uri: (string-utf8 256),
    asset: uint,
    price: uint,
    token-contract: (optional principal),
    published: bool,
    x402-enabled: bool,
    purchase-count: uint,
    created-at: uint
  }
)

(define-map access-grants
  { listing-id: uint, buyer: principal }
  {
    purchased-at: uint,
    asset: uint,
    purchase-kind: uint,
    payment-ref: (optional (buff 32))
  }
)

(define-map settled-payments
  { payment-ref: (buff 32) }
  {
    listing-id: uint,
    buyer: principal,
    recorded-at: uint
  }
)

(define-private (is-valid-asset (asset uint))
  (or
    (is-eq asset asset-stx)
    (is-eq asset asset-sbtc)
    (is-eq asset asset-usdcx)
  )
)

;; #[allow(unchecked_params)]
(define-private (assert-valid-asset-config (asset uint) (token-contract (optional principal)))
  (begin
    (asserts! (is-valid-asset asset) err-invalid-asset)
    (if (is-eq asset asset-stx)
      (asserts! (is-none token-contract) err-token-contract-not-allowed)
      (asserts! (is-some token-contract) err-token-contract-required)
    )
    (ok true)
  )
)

;; #[allow(unchecked_params)]
(define-private (assert-listing-fields
  (title (string-utf8 64))
  (summary (string-utf8 256))
  (metadata-uri (string-utf8 256))
  (price uint)
)
  (begin
    (asserts! (> (len title) u0) err-empty-field)
    (asserts! (> (len summary) u0) err-empty-field)
    (asserts! (> (len metadata-uri) u0) err-empty-field)
    (asserts! (> price u0) err-invalid-price)
    (ok true)
  )
)

(define-private (load-listing (listing-id uint))
  (match (map-get? listings { listing-id: listing-id })
    listing (ok listing)
    err-listing-not-found
  )
)

(define-private (set-access
  (listing-id uint)
  (
    listing
    {
      seller: principal,
      title: (string-utf8 64),
      summary: (string-utf8 256),
      metadata-uri: (string-utf8 256),
      asset: uint,
      price: uint,
      token-contract: (optional principal),
      published: bool,
      x402-enabled: bool,
      purchase-count: uint,
      created-at: uint
    }
  )
  (buyer principal)
  (purchase-kind uint)
  (payment-ref (optional (buff 32)))
)
  (begin
    (asserts! (is-none (map-get? access-grants { listing-id: listing-id, buyer: buyer })) err-already-purchased)
    (map-set access-grants
      { listing-id: listing-id, buyer: buyer }
      {
        purchased-at: stacks-block-height,
        asset: (get asset listing),
        purchase-kind: purchase-kind,
        payment-ref: payment-ref
      }
    )
    (map-set listings
      { listing-id: listing-id }
      (merge listing { purchase-count: (+ (get purchase-count listing) u1) })
    )
    (ok true)
  )
)

(define-public (set-access-recorder (new-recorder principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    ;; #[allow(unchecked_data)]
    (var-set access-recorder new-recorder)
    (ok new-recorder)
  )
)

(define-public (create-listing
  (title (string-utf8 64))
  (summary (string-utf8 256))
  (metadata-uri (string-utf8 256))
  (asset uint)
  (price uint)
  (token-contract (optional principal))
  (x402-enabled bool)
)
  (let
    (
      (listing-id (+ (var-get listing-nonce) u1))
      (listing
        {
          seller: tx-sender,
          title: title,
          summary: summary,
          metadata-uri: metadata-uri,
          asset: asset,
          price: price,
          token-contract: token-contract,
          published: false,
          x402-enabled: x402-enabled,
          purchase-count: u0,
          created-at: stacks-block-height
        }
      )
    )
    (begin
      (try! (assert-listing-fields title summary metadata-uri price))
      (try! (assert-valid-asset-config asset token-contract))
      (map-set listings { listing-id: listing-id } listing)
      (var-set listing-nonce listing-id)
      (ok listing-id)
    )
  )
)

(define-public (update-listing
  (listing-id uint)
  (title (string-utf8 64))
  (summary (string-utf8 256))
  (metadata-uri (string-utf8 256))
  (asset uint)
  (price uint)
  (token-contract (optional principal))
  (x402-enabled bool)
)
  (let ((listing (try! (load-listing listing-id))))
    (begin
      (asserts! (is-eq (get seller listing) tx-sender) err-not-seller)
      (try! (assert-listing-fields title summary metadata-uri price))
      (try! (assert-valid-asset-config asset token-contract))
      (map-set listings
        { listing-id: listing-id }
        (merge listing
          {
            title: title,
            summary: summary,
            metadata-uri: metadata-uri,
            asset: asset,
            price: price,
            token-contract: token-contract,
            x402-enabled: x402-enabled
          }
        )
      )
      (ok listing-id)
    )
  )
)

(define-public (publish-listing (listing-id uint))
  (let ((listing (try! (load-listing listing-id))))
    (begin
      (asserts! (is-eq (get seller listing) tx-sender) err-not-seller)
      (map-set listings
        { listing-id: listing-id }
        (merge listing { published: true })
      )
      (ok true)
    )
  )
)

(define-public (unpublish-listing (listing-id uint))
  (let ((listing (try! (load-listing listing-id))))
    (begin
      (asserts! (is-eq (get seller listing) tx-sender) err-not-seller)
      (map-set listings
        { listing-id: listing-id }
        (merge listing { published: false })
      )
      (ok true)
    )
  )
)

(define-public (buy-with-stx (listing-id uint))
  (let ((listing (try! (load-listing listing-id))))
    (begin
      (asserts! (get published listing) err-not-published)
      (asserts! (is-eq (get asset listing) asset-stx) err-asset-mismatch)
      (asserts! (not (is-eq (get seller listing) tx-sender)) err-self-purchase)
      (try! (stx-transfer? (get price listing) tx-sender (get seller listing)))
      (try! (set-access listing-id listing tx-sender purchase-kind-direct none))
      (ok true)
    )
  )
)

(define-public (buy-with-token (listing-id uint) (payment-contract <sip010-ft-trait>))
  (let
    (
      (listing (try! (load-listing listing-id)))
      (token-principal (contract-of payment-contract))
    )
    (begin
      (asserts! (get published listing) err-not-published)
      (asserts! (not (is-eq (get asset listing) asset-stx)) err-asset-mismatch)
      (asserts! (not (is-eq (get seller listing) tx-sender)) err-self-purchase)
      (try!
        (match (get token-contract listing)
          stored-contract
            (if (is-eq stored-contract token-principal)
              (ok true)
              err-token-contract-mismatch
            )
          err-token-contract-required
        )
      )
      (try! (contract-call? payment-contract transfer (get price listing) tx-sender (get seller listing) none))
      (try! (set-access listing-id listing tx-sender purchase-kind-direct none))
      (ok true)
    )
  )
)

(define-public (record-x402-purchase (listing-id uint) (buyer principal) (payment-ref (buff 32)))
  (let ((listing (try! (load-listing listing-id))))
    (begin
      (asserts! (is-eq tx-sender (var-get access-recorder)) err-owner-only)
      (asserts! (get published listing) err-not-published)
      (asserts! (get x402-enabled listing) err-x402-disabled)
      (asserts! (not (is-eq buyer (get seller listing))) err-invalid-buyer)
      (asserts! (is-none (map-get? settled-payments { payment-ref: payment-ref })) err-duplicate-payment)
      ;; #[allow(unchecked_data)]
      (map-set settled-payments
        { payment-ref: payment-ref }
        { listing-id: listing-id, buyer: buyer, recorded-at: stacks-block-height }
      )
      ;; #[allow(unchecked_data)]
      (try! (set-access listing-id listing buyer purchase-kind-x402 (some payment-ref)))
      (ok true)
    )
  )
)

(define-read-only (get-listing (listing-id uint))
  (ok (map-get? listings { listing-id: listing-id }))
)

(define-read-only (get-listing-count)
  (ok (var-get listing-nonce))
)

(define-read-only (get-access-recorder)
  (ok (var-get access-recorder))
)

(define-read-only (get-access (listing-id uint) (buyer principal))
  (ok (map-get? access-grants { listing-id: listing-id, buyer: buyer }))
)

(define-read-only (has-access (listing-id uint) (buyer principal))
  (ok (is-some (map-get? access-grants { listing-id: listing-id, buyer: buyer })))
)
