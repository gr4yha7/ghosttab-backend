let esmModule = null;

async function loadESM() {
  if (!esmModule) {
    esmModule = await import("./gasSponsor.esm.mjs");
  }
  return esmModule;
}

module.exports = {
  async sponsorTransaction(transaction, senderAuth) {
    const mod = await loadESM();
    return mod.sponsorTransaction(transaction, senderAuth);
  }
};
