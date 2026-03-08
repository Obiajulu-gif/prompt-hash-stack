(impl-trait .sip010-ft-trait.sip010-ft-trait)

(define-fungible-token mock-sbtc-token)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-invalid-amount (err u102))

(define-constant token-name "Mock sBTC")
(define-constant token-symbol "sBTC")
(define-constant token-decimals u8)

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (> amount u0) err-invalid-amount)
    (try! (ft-mint? mock-sbtc-token amount recipient))
    (ok true)
  )
)

(define-public (transfer
  (amount uint)
  (sender principal)
  (recipient principal)
  (memo (optional (buff 34)))
)
  (begin
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (is-eq tx-sender sender) err-not-token-owner)
    (match memo memo-value (print memo-value) 0x00)
    (try! (ft-transfer? mock-sbtc-token amount sender recipient))
    (ok true)
  )
)

(define-read-only (get-name)
  (ok token-name)
)

(define-read-only (get-symbol)
  (ok token-symbol)
)

(define-read-only (get-decimals)
  (ok token-decimals)
)

(define-read-only (get-balance (owner principal))
  (ok (ft-get-balance mock-sbtc-token owner))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply mock-sbtc-token))
)

(define-read-only (get-token-uri)
  (ok none)
)
