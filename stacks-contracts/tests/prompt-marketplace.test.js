import assert from "node:assert/strict";
import test from "node:test";
import { initSimnet } from "@stacks/clarinet-sdk";
import { Cl, cvToJSON } from "@stacks/transactions";

function ok(result) {
  const json = cvToJSON(result);
  assert.equal(json.success, true, JSON.stringify(json));
  return json.value;
}

function err(result) {
  const json = cvToJSON(result);
  assert.equal(json.success, false, JSON.stringify(json));
  return json.value;
}

function some(value) {
  assert.ok(value, "expected a value");
  assert.match(value.type, /^\(optional /);
  assert.ok(value.value, JSON.stringify(value));
  return value.value;
}

async function bootSimnet() {
  return initSimnet(undefined, true);
}

function accountsFor(simnet) {
  const accounts = simnet.getAccounts();
  return {
    deployer: accounts.get("deployer"),
    seller: accounts.get("wallet_1"),
    buyer: accounts.get("wallet_2"),
    altBuyer: accounts.get("wallet_3"),
  };
}

function createListingArgs({ asset, price, tokenContract, x402Enabled, suffix }) {
  return [
    Cl.stringUtf8(`Listing ${suffix}`),
    Cl.stringUtf8(`Summary ${suffix}`),
    Cl.stringUtf8(`listing://market/${suffix}`),
    Cl.uint(asset),
    Cl.uint(price),
    tokenContract,
    Cl.bool(x402Enabled),
  ];
}

test("creates, updates, and publishes listings", async () => {
  const simnet = await bootSimnet();
  const { seller } = accountsFor(simnet);

  const created = simnet.callPublicFn(
    "prompt-marketplace",
    "create-listing",
    createListingArgs({
      asset: 1,
      price: 100_000,
      tokenContract: Cl.none(),
      x402Enabled: true,
      suffix: "draft",
    }),
    seller,
  );
  assert.equal(ok(created.result).value, "1");

  const updated = simnet.callPublicFn(
    "prompt-marketplace",
    "update-listing",
    [
      Cl.uint(1),
      Cl.stringUtf8("Published Draft"),
      Cl.stringUtf8("Updated description"),
      Cl.stringUtf8("listing://market/draft-updated"),
      Cl.uint(1),
      Cl.uint(150_000),
      Cl.none(),
      Cl.bool(false),
    ],
    seller,
  );
  assert.equal(ok(updated.result).value, "1");

  const published = simnet.callPublicFn(
    "prompt-marketplace",
    "publish-listing",
    [Cl.uint(1)],
    seller,
  );
  assert.equal(ok(published.result).value, true);

  const listing = some(
    ok(
      simnet.callReadOnlyFn(
        "prompt-marketplace",
        "get-listing",
        [Cl.uint(1)],
        seller,
      ).result,
    ),
  );

  assert.equal(listing.value.title.value, "Published Draft");
  assert.equal(listing.value.summary.value, "Updated description");
  assert.equal(listing.value["metadata-uri"].value, "listing://market/draft-updated");
  assert.equal(listing.value.price.value, "150000");
  assert.equal(listing.value.published.value, true);
  assert.equal(listing.value["x402-enabled"].value, false);
});

test("processes direct STX purchases and prevents duplicates", async () => {
  const simnet = await bootSimnet();
  const { seller, buyer } = accountsFor(simnet);

  simnet.callPublicFn(
    "prompt-marketplace",
    "create-listing",
    createListingArgs({
      asset: 1,
      price: 250_000,
      tokenContract: Cl.none(),
      x402Enabled: true,
      suffix: "stx",
    }),
    seller,
  );
  simnet.callPublicFn("prompt-marketplace", "publish-listing", [Cl.uint(1)], seller);

  const purchased = simnet.callPublicFn(
    "prompt-marketplace",
    "buy-with-stx",
    [Cl.uint(1)],
    buyer,
  );
  assert.equal(ok(purchased.result).value, true);

  const hasAccess = ok(
    simnet.callReadOnlyFn(
      "prompt-marketplace",
      "has-access",
      [Cl.uint(1), Cl.standardPrincipal(buyer)],
      buyer,
    ).result,
  );
  assert.equal(hasAccess.value, true);

  const duplicate = simnet.callPublicFn(
    "prompt-marketplace",
    "buy-with-stx",
    [Cl.uint(1)],
    buyer,
  );
  assert.equal(err(duplicate.result).value, "107");
});

test("processes sBTC token purchases through the SIP-010 trait", async () => {
  const simnet = await bootSimnet();
  const { deployer, seller, buyer } = accountsFor(simnet);

  simnet.callPublicFn(
    "prompt-marketplace",
    "create-listing",
    createListingArgs({
      asset: 2,
      price: 50_000,
      tokenContract: Cl.some(Cl.contractPrincipal(deployer, "mock-sbtc-token")),
      x402Enabled: true,
      suffix: "sbtc",
    }),
    seller,
  );
  simnet.callPublicFn("prompt-marketplace", "publish-listing", [Cl.uint(1)], seller);

  const minted = simnet.callPublicFn(
    "mock-sbtc-token",
    "mint",
    [Cl.uint(100_000), Cl.standardPrincipal(buyer)],
    deployer,
  );
  assert.equal(ok(minted.result).value, true);

  const purchased = simnet.callPublicFn(
    "prompt-marketplace",
    "buy-with-token",
    [Cl.uint(1), Cl.contractPrincipal(deployer, "mock-sbtc-token")],
    buyer,
  );
  assert.equal(ok(purchased.result).value, true);

  const sellerBalance = ok(
    simnet.callReadOnlyFn(
      "mock-sbtc-token",
      "get-balance",
      [Cl.standardPrincipal(seller)],
      seller,
    ).result,
  );
  assert.equal(sellerBalance.value, "50000");
});

test("records x402 purchases on-chain with the designated recorder", async () => {
  const simnet = await bootSimnet();
  const { deployer, seller, buyer, altBuyer } = accountsFor(simnet);

  simnet.callPublicFn(
    "prompt-marketplace",
    "create-listing",
    createListingArgs({
      asset: 1,
      price: 325_000,
      tokenContract: Cl.none(),
      x402Enabled: true,
      suffix: "x402",
    }),
    seller,
  );
  simnet.callPublicFn("prompt-marketplace", "publish-listing", [Cl.uint(1)], seller);

  const paymentRef = Cl.bufferFromHex("11".repeat(32));
  const recorded = simnet.callPublicFn(
    "prompt-marketplace",
    "record-x402-purchase",
    [Cl.uint(1), Cl.standardPrincipal(altBuyer), paymentRef],
    deployer,
  );
  assert.equal(ok(recorded.result).value, true);

  const access = some(
    ok(
      simnet.callReadOnlyFn(
        "prompt-marketplace",
        "get-access",
        [Cl.uint(1), Cl.standardPrincipal(altBuyer)],
        altBuyer,
      ).result,
    ),
  );

  assert.equal(access.value.asset.value, "1");
  assert.equal(access.value["purchase-kind"].value, "2");
  assert.equal(access.value["payment-ref"].value.value, "0x1111111111111111111111111111111111111111111111111111111111111111");

  const duplicate = simnet.callPublicFn(
    "prompt-marketplace",
    "record-x402-purchase",
    [Cl.uint(1), Cl.standardPrincipal(buyer), paymentRef],
    deployer,
  );
  assert.equal(err(duplicate.result).value, "109");
});
