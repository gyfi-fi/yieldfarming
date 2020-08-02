$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const gYFI_POOL_2 = new ethers.Contract(gYFI_POOL_2_ADDR, YGOV_BPT_STAKING_POOL_ABI, App.provider);
    const gYFI_DAI_BALANCER_POOL = new ethers.Contract(gYFI_DAI_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const gYFI_DAI_BPT_TOKEN_CONTRACT = new ethers.Contract(gYFI_DAI_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);
    const gYFI_YCRV_BALANCER_POOL = new ethers.Contract(gYFI_YCRV_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);


    const stakedBPTAmount = await gYFI_POOL_2.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedgYFI = await gYFI_POOL_2.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await gYFI_DAI_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await gYFI_DAI_BPT_TOKEN_CONTRACT.balanceOf(gYFI_POOL_2_ADDR) / 1e18;
    const totalgYFIAmount = await gYFI_DAI_BALANCER_POOL.getBalance(gYFI_TOKEN_ADDR) / 1e18;
    const totalDAIAmount = await gYFI_DAI_BALANCER_POOL.getBalance(DAI_TOKEN_ADDR) / 1e18;

    const gYFIPerBPT = totalgYFIAmount / totalBPTAmount;
    const DAIPerBPT = totalDAIAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(gYFI_POOL_2);
    const nextHalving = await getPeriodFinishForReward(gYFI_POOL_2);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;


    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["dai"]);
    const DAIPrice = prices["dai"].usd;
    const gYFIPrice = (await gYFI_DAI_BALANCER_POOL.getSpotPrice(DAI_TOKEN_ADDR,gYFI_TOKEN_ADDR) / 1e18) * DAIPrice;
    const gYFIPrice2 = (await gYFI_YCRV_BALANCER_POOL.getSpotPrice(Y_TOKEN_ADDR, gYFI_TOKEN_ADDR) / 1e18) * YVirtualPrice;


    const BPTPrice = gYFIPerBPT * gYFIPrice + DAIPerBPT * DAIPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 gYFI  = ${toDollar(gYFIPrice)} or ${toDollar(gYFIPrice2)} in yCRV pool.` );
    _print(`1 DAI   = $${DAIPrice}\n`);
    _print(`1 BPT   = [${gYFIPerBPT} YFII, ${DAIPerBPT} DAI]`);
    _print(`        = ${toDollar(gYFIPerBPT * gYFIPrice + DAIPerBPT * DAIPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by gYFI DAI Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in gYFI's BPT staking pool.`);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${gYFIPerBPT * stakedBPTAmount} gYFI, ${DAIPerBPT * stakedBPTAmount} DAI]`);
    _print(`                  = ${toDollar(gYFIPerBPT * stakedBPTAmount * gYFIPrice + DAIPerBPT * stakedBPTAmount * DAIPrice)}\n`);

    // YFII REWARDS
    _print("======== YFII REWARDS ========")
    // _print(" (Temporarily paused until further emission model is voted by the community) ");
    _print(`Claimable Rewards : ${toFixed(earnedgYFI, 4)} gYFI = ${toDollar(earnedgYFI * gYFIPrice)}`);
    const gYFIWeeklyEstimate = rewardPerToken * stakedBPTAmount;

    _print(`Hourly estimate   : ${toFixed(gYFIWeeklyEstimate / (7 * 24), 4)} gYFI = ${toDollar((gYFIWeeklyEstimate / (7 * 24)) * gYFIPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} gYFI)`)
    _print(`Daily estimate    : ${toFixed(gYFIWeeklyEstimate / 7, 4)} gYFI = ${toDollar((gYFIWeeklyEstimate / 7) * gYFIPrice)} (out of total  ${toFixed(weekly_reward / 7, 2)} gYFI)`)
    _print(`Weekly estimate   : ${toFixed(gYFIWeeklyEstimate, 4)} gYFI = ${toDollar(gYFIWeeklyEstimate * gYFIPrice)} (out of total ${weekly_reward} gYFI)`)
    const gYFIWeeklyROI = (rewardPerToken * gYFIPrice) * 100 / (BPTPrice);

    _print(`\nHourly ROI in USD : ${toFixed((gYFIWeeklyROI / 7) / 24, 4)}%`);
    _print(`Daily ROI in USD  : ${toFixed(gYFIWeeklyROI / 7, 4)}%`);
    _print(`Weekly ROI in USD : ${toFixed(gYFIWeeklyROI, 4)}%`);
    _print(`APY (unstable)    : ${toFixed(gYFIWeeklyROI * 52, 4)}% \n`);

    const timeTilHalving = nextHalving - (Date.now() / 1000);

    _print(`Next halving      : in ${forHumans(timeTilHalving)} \n`)

    // BAL REWARDS
    _print("======= BAL REWARDS ? =======")
    _print(`    Not whitelisted yet?`);
    _print(`    Check http://www.predictions.exchange/balancer/ for latest update \n`)

    hideLoading();

}