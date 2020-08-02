$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const gYFI_POOL_3 = new ethers.Contract(gYFI_POOL_3_ADDR, gYFI_REWARD_CONTRACT_ABI, App.provider);
    const gYFI_YCRV_BALANCER_POOL = new ethers.Contract(gYFI_YCRV_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const YFI_YCRV_BPT_TOKEN_CONTRACT = new ethers.Contract(gYFI_YCRV_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);
    const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);
    const gYFI_DAI_BALANCER_POOL = new ethers.Contract(gYFI_DAI_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);

    const stakedBPTAmount = await gYFI_POOL_3.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedgYFI_raw = await gYFI_POOL_3.earned(App.YOUR_ADDRESS);

    const startTime = await gYFI_POOL_3.starttime();

    const earnedgYFI = earnedgYFI_raw / 1e18;
    const totalBPTAmount = await gYFI_YCRV_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFI_YCRV_BPT_TOKEN_CONTRACT.balanceOf(gYFI_POOL_3_ADDR) / 1e18;
    const totalgYFIAmount = await gYFI_YCRV_BALANCER_POOL.getBalance(gYFI_TOKEN_ADDR) / 1e18;
    const totalYAmount = await gYFI_YCRV_BALANCER_POOL.getBalance(Y_TOKEN_ADDR) / 1e18;

    // const yourUnstakedBPTAmount = await YFI_YCRV_BPT_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS) / 1e18;

    const gYFIPerBPT = totalgYFIAmount / totalBPTAmount;
    const YPerBPT = totalYAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(gYFI_POOL_3);
    const nextHalving = await getPeriodFinishForReward(gYFI_POOL_3);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    // Find out underlying assets of Y
    const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["dai"]);
    const DAIPrice = prices.dai.usd;


    const gYFIPrice = (await gYFI_DAI_BALANCER_POOL.getSpotPrice(DAI_TOKEN_ADDR,gYFI_TOKEN_ADDR) / 1e18) * DAIPrice;
    const gYFIPrice2 = (await gYFI_YCRV_BALANCER_POOL.getSpotPrice(Y_TOKEN_ADDR, gYFI_TOKEN_ADDR) / 1e18) * YVirtualPrice;

    const BPTPrice = gYFIPerBPT * gYFIPrice + YPerBPT * YVirtualPrice;

    // Get Time Until reward Starts
    const timeUntil = startTime - (Date.now() / 1000);

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 gYFI  = ${toDollar(gYFIPrice)} or ${toDollar(gYFIPrice2)} in yCRV pool.` );
    _print(`1 yCRV  = ${toDollar(YVirtualPrice)}`);
    _print(`1 BPT   = [${gYFIPerBPT} gYFI, ${YPerBPT} yCRV]`);
    _print(`        = ${toDollar(gYFIPerBPT * gYFIPrice + YPerBPT * YVirtualPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by gYFI-yCRV Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in BPT staking pool 3. `);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${gYFIPerBPT * stakedBPTAmount} gYFI, ${YPerBPT * stakedBPTAmount} yCRV]`);
    _print(`                  = ${toDollar(gYFIPerBPT * stakedBPTAmount * gYFIPrice + YPerBPT * stakedBPTAmount * YVirtualPrice)}\n`);


    // YFI REWARDS
    if (timeUntil > 0) {
        _print_bold(`Starts in ${forHumans(timeUntil)}`)
    }

    _print(`\n======== gYFI REWARDS ========`)
    _print(`Claimable Rewards : ${toFixed(earnedgYFI, 4)} gYFI = ${toDollar(earnedgYFI * gYFIPrice)}`);
    const weeklyEstimate = rewardPerToken * stakedBPTAmount;

    _print(`Hourly estimate   : ${toFixed(weeklyEstimate / (24 * 7), 2)} gYFI = ${toDollar((weeklyEstimate / (24 * 7)) * gYFIPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} gYFI)`)
    _print(`Daily estimate    : ${toFixed(weeklyEstimate / 7, 2)} gYFI = ${toDollar(weeklyEstimate * gYFIPrice / 7)} (out of total ${toFixed(weekly_reward / 7, 2)} gYFI)`)
    _print(`Weekly estimate   : ${toFixed(weeklyEstimate, 2)} gYFI = ${toDollar(weeklyEstimate * gYFIPrice)} (out of total ${weekly_reward} gYFI)`)
    const gYFIWeeklyROI = (rewardPerToken * gYFIPrice) * 100 / (BPTPrice);

    _print(`\nHourly ROI in USD : ${toFixed((gYFIWeeklyROI / 7) / 24, 4)}%`);
    _print(`Daily ROI in USD  : ${toFixed(gYFIWeeklyROI / 7, 4)}%`);
    _print(`Weekly ROI in USD : ${toFixed(gYFIWeeklyROI, 4)}%`);
    _print(`APY (unstable)    : ${toFixed(gYFIWeeklyROI * 52, 4)}% \n`);

    const timeTilHalving = nextHalving - (Date.now() / 1000);

    _print(`Next halving      : in ${forHumans(timeTilHalving)} \n`)

    // BAL REWARDS
    _print("\n======= BAL REWARDS ? =======")
    _print(`    Not whitelisted yet?`);
    _print(`    Check http://www.predictions.exchange/balancer/ for latest update \n`)

    // CRV REWARDS
    _print("======== CRV REWARDS ========")
    _print(`    Not distributed yet\n`);

    hideLoading();
}