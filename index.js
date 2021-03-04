const moment = require("moment");

const Web3 = require("web3");

const config = require("./config.json");

const gateway = "https://http-mainnet.hecochain.com";

const account = "钱包地址";
const private = "钱包私钥";

const maxCounter = 1;
let counter = 0;

const open_payload = {
  symbol: "0x627463",
  amount: "2",
  direction: 1,
  maxPrice: "0",
  approvedUsdt: "100060674000000000000",
  parent: "0x3534aE24BaD96a952590f41a786102012f731eAb",
  withDiscount: false
};

const close_payload = {
  symbol: "0x627463",
  amount: "2",
  maxPrice: "0"
};

const contracts = {};

const localTime = () => {
  return moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
};

const info = () => {
  console.log("BTC/USDT");
  console.log(open_payload.direction === 1 ? "多" : "空");
};

const init = async () => {
  info();

  const web3 = new Web3(gateway);

  web3.eth.accounts.wallet.add(private);

  // cmaster = master
  // cusdt = usdt
  // cdtoken = dtoken
  // clptokenwrapper = lptokenwrapper
  // clptoken = lptoken
  // cuniswap = uniswap
  // coracle = oracle
  // cusdtDtokenUniv2 = usdtDtokenUniv2
  const ids = ["master", "usdt", "dtoken", "lptokenwrapper", "lptoken", "uniswap", "oracle", "usdtDtokenUniv2"];
  ids.forEach(v => {
    const tmp = config.o.contract[v];
    const contract = new web3.eth.Contract(tmp.abi, tmp.contractAddress);
    contracts[v] = contract;
  });
};

const usdtBalance = async () => {
  const balance = await contracts.usdt.methods.balanceOf(account).call({
    from: account
  });

  return Web3.utils.fromWei(balance, "ether");
};

const loop = async () => {
  console.log("\n");
  const balance = await usdtBalance();
  console.log(localTime(), "usdt balance", balance);

  try {
    await contracts.master.methods
      .openPosition(open_payload.symbol, open_payload.amount, open_payload.direction, open_payload.maxPrice, open_payload.approvedUsdt, open_payload.parent, open_payload.withDiscount)
      .send(
        {
          from: account,
          gas: 611313
        },
        (e, trx) => {
          console.log(localTime(), "openPosition", trx);
        }
      )
      .on("receipt", async receipt => {
        await contracts.master.methods
          .closePosition(close_payload.symbol, close_payload.amount, close_payload.maxPrice)
          .send(
            {
              from: account,
              gas: 611313
            },
            (e, trx) => {
              console.log(localTime(), "closePosition", trx);
            }
          )
          .on("receipt", async receipt => {
            const balance = await usdtBalance();
            console.log(localTime(), "usdt balance", balance);

            counter++;
            if (counter < maxCounter) {
              await loop();
            }
          });
      });
  } catch (error) {
    throw error;
  }
};

const main = async () => {
  await init();
  await loop();
};

try {
  main();
} catch (error) {
  console.log(error);
}
