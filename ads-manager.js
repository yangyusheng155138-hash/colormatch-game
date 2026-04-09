/**
 * 广告管理器
 * Ads Manager - 管理游戏中所有广告位的展示逻辑
 */

class AdsManager {
    constructor() {
        // ===================== 配置你的广告单元ID =====================
        // TikTok测试广告ID - 用于开发测试，正式上线需替换为正式ID
        this.adUnitIds = {
            // 激励视频广告 - 用于复活
            REWARDED_RESURRECT: 'test_rewarded_video_ad',
            
            // 激励视频广告 - 用于双倍奖励
            REWARDED_DOUBLE_REWARD: 'test_rewarded_video_ad',
            
            // 激励视频广告 - 用于额外步数/提示
            REWARDED_EXTRA_MOVES: 'test_rewarded_video_ad',
            
            // 插屏广告 - 用于游戏结束
            INTERSTITIAL_GAME_OVER: 'test_interstitial_ad',
            
            // 插屏广告 - 用于关卡切换
            INTERSTITIAL_LEVEL_COMPLETE: 'test_interstitial_ad',
            
            // Banner广告 - 游戏底部
            BANNER_BOTTOM: 'test_banner_ad'
        };
        
        // 广告展示频率控制
        this.config = {
            // 每局游戏最多展示插屏广告次数
            maxInterstitialPerGame: 3,
            
            // 两次插屏广告之间的最小间隔（秒）
            interstitialInterval: 45,
            
            // 游戏进行多少秒后才会展示插屏广告
            minPlayTimeForInterstitial: 20,
            
            // 是否启用Banner广告
            enableBannerAd: true,
            
            // 是否预加载激励视频
            preloadRewardedAds: true
        };
        
        // 状态追踪
        this.state = {
            interstitialShownCount: 0,
            lastInterstitialTime: 0,
            gameStartTime: 0,
            bannerAd: null,
            isBannerVisible: false,
            totalAdsShown: {
                rewarded: 0,
                interstitial: 0,
                banner: 0
            }
        };

        // 初始化时预加载广告
        this._init();
    }

    async _init() {
        // 等待SDK准备好
        if (!window.ttSDK) {
            setTimeout(() => this._init(), 500);
            return;
        }

        // 预加载激励视频广告
        if (this.config.preloadRewardedAds) {
            await this.preloadRewardedAds();
        }
    }

    /**
     * 预加载激励视频广告
     */
    async preloadRewardedAds() {
        console.log('[AdsManager] Preloading rewarded ads...');
        
        const adTypes = [
            this.adUnitIds.REWARDED_RESURRECT,
            this.adUnitIds.REWARDED_DOUBLE_REWARD
        ];

        for (const adUnitId of adTypes) {
            if (adUnitId && !adUnitId.includes('your_')) {
                await window.ttSDK.preloadRewardedVideoAd(adUnitId);
            }
        }
    }

    /**
     * 游戏开始时调用
     */
    onGameStart() {
        this.state.interstitialShownCount = 0;
        this.state.gameStartTime = Date.now();
        this.state.lastInterstitialTime = 0;
        
        // 显示Banner广告
        if (this.config.enableBannerAd) {
            this.showBannerAd();
        }

        console.log('[AdsManager] Game started, ads state reset');
    }

    /**
     * 游戏结束时调用
     */
    onGameEnd() {
        // 隐藏Banner广告
        this.hideBannerAd();
        
        console.log('[AdsManager] Game ended, stats:', this.state.totalAdsShown);
    }

    /**
     * 显示复活广告
     * @returns {Promise<boolean>} 是否观看完成获得复活资格
     */
    async showResurrectAd() {
        console.log('[AdsManager] Showing resurrect ad...');
        
        // 检查是否配置了有效的广告ID
        if (this.adUnitIds.REWARDED_RESURRECT.includes('your_')) {
            console.warn('[AdsManager] Resurrect ad unit ID not configured');
            // 开发测试模式下直接返回成功
            return new Promise((resolve) => {
                setTimeout(() => {
                    if (confirm('🎬 Development Mode: Simulate watching ad to revive?')) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }, 500);
            });
        }
        
        try {
            const result = await window.ttSDK.showRewardedVideoAd(
                this.adUnitIds.REWARDED_RESURRECT
            );
            
            if (result.isEnded) {
                this.state.totalAdsShown.rewarded++;
                window.ttSDK.onAdClick('rewarded_resurrect', this.adUnitIds.REWARDED_RESURRECT);
                console.log('[AdsManager] Resurrect ad completed');
                return true;
            }
            console.log('[AdsManager] Resurrect ad skipped');
            return false;
        } catch (err) {
            console.error('[AdsManager] Resurrect ad failed:', err);
            // 广告失败时仍然允许复活（提升用户体验）
            return true;
        }
    }

    /**
     * 显示双倍奖励广告
     * @returns {Promise<boolean>} 是否观看完成获得双倍奖励
     */
    async showDoubleRewardAd() {
        console.log('[AdsManager] Showing double reward ad...');
        
        if (this.adUnitIds.REWARDED_DOUBLE_REWARD.includes('your_')) {
            console.warn('[AdsManager] Double reward ad unit ID not configured');
            return new Promise((resolve) => {
                setTimeout(() => {
                    if (confirm('🎬 Development Mode: Simulate watching ad for double rewards?')) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }, 500);
            });
        }
        
        try {
            const result = await window.ttSDK.showRewardedVideoAd(
                this.adUnitIds.REWARDED_DOUBLE_REWARD
            );
            
            if (result.isEnded) {
                this.state.totalAdsShown.rewarded++;
                window.ttSDK.onAdClick('rewarded_double_reward', this.adUnitIds.REWARDED_DOUBLE_REWARD);
                console.log('[AdsManager] Double reward ad completed');
                return true;
            }
            return false;
        } catch (err) {
            console.error('[AdsManager] Double reward ad failed:', err);
            return false;
        }
    }

    /**
     * 显示额外步数广告
     * @returns {Promise<boolean>}
     */
    async showExtraMovesAd() {
        console.log('[AdsManager] Showing extra moves ad...');
        
        if (this.adUnitIds.REWARDED_EXTRA_MOVES.includes('your_')) {
            return Promise.resolve(true); // 开发模式直接通过
        }
        
        try {
            const result = await window.ttSDK.showRewardedVideoAd(
                this.adUnitIds.REWARDED_EXTRA_MOVES
            );
            
            if (result.isEnded) {
                this.state.totalAdsShown.rewarded++;
                window.ttSDK.onAdClick('rewarded_extra_moves', this.adUnitIds.REWARDED_EXTRA_MOVES);
                return true;
            }
            return false;
        } catch (err) {
            console.error('[AdsManager] Extra moves ad failed:', err);
            return false;
        }
    }

    /**
     * 显示游戏结束插屏广告
     * 根据频率控制决定是否展示
     */
    async showGameOverInterstitial() {
        const playTime = (Date.now() - this.state.gameStartTime) / 1000;
        const timeSinceLastAd = (Date.now() - this.state.lastInterstitialTime) / 1000;
        
        // 检查是否需要展示
        if (this.state.interstitialShownCount >= this.config.maxInterstitialPerGame) {
            console.log('[AdsManager] Interstitial limit reached for this game');
            return false;
        }
        
        if (playTime < this.config.minPlayTimeForInterstitial) {
            console.log('[AdsManager] Play time too short for interstitial');
            return false;
        }
        
        if (timeSinceLastAd < this.config.interstitialInterval && this.state.lastInterstitialTime > 0) {
            console.log('[AdsManager] Interstitial interval not met');
            return false;
        }
        
        console.log('[AdsManager] Showing game over interstitial...');
        
        // 隐藏Banner广告避免冲突
        this.hideBannerAd();
        
        try {
            const result = await window.ttSDK.showInterstitialAd(
                this.adUnitIds.INTERSTITIAL_GAME_OVER
            );
            
            if (result.showed) {
                this.state.interstitialShownCount++;
                this.state.lastInterstitialTime = Date.now();
                this.state.totalAdsShown.interstitial++;
                window.ttSDK.onAdClick('interstitial_game_over', this.adUnitIds.INTERSTITIAL_GAME_OVER);
                console.log('[AdsManager] Game over interstitial shown');
            }
            
            // 恢复Banner广告
            if (this.config.enableBannerAd) {
                setTimeout(() => this.showBannerAd(), 1000);
            }
            
            return result.showed;
        } catch (err) {
            console.error('[AdsManager] Game over interstitial failed:', err);
            this.showBannerAd(); // 恢复Banner
            return false;
        }
    }

    /**
     * 显示关卡完成插屏广告
     */
    async showLevelCompleteInterstitial() {
        // 每3关显示一次插屏广告
        if (window.game?.level % 3 !== 0) {
            return false;
        }
        
        const timeSinceLastAd = (Date.now() - this.state.lastInterstitialTime) / 1000;
        if (timeSinceLastAd < this.config.interstitialInterval) {
            return false;
        }
        
        console.log('[AdsManager] Showing level complete interstitial...');
        
        this.hideBannerAd();
        
        try {
            const result = await window.ttSDK.showInterstitialAd(
                this.adUnitIds.INTERSTITIAL_LEVEL_COMPLETE
            );
            
            if (result.showed) {
                this.state.interstitialShownCount++;
                this.state.lastInterstitialTime = Date.now();
                this.state.totalAdsShown.interstitial++;
                window.ttSDK.onAdClick('interstitial_level_complete', this.adUnitIds.INTERSTITIAL_LEVEL_COMPLETE);
            }
            
            setTimeout(() => this.showBannerAd(), 1000);
            return result.showed;
        } catch (err) {
            console.error('[AdsManager] Level complete interstitial failed:', err);
            this.showBannerAd();
            return false;
        }
    }

    /**
     * 显示Banner广告
     */
    showBannerAd() {
        if (!this.config.enableBannerAd) return;
        if (this.state.isBannerVisible) return;
        if (this.adUnitIds.BANNER_BOTTOM.includes('your_')) {
            console.log('[AdsManager] Banner ad unit ID not configured');
            return;
        }
        
        console.log('[AdsManager] Showing banner ad...');
        
        if (!this.state.bannerAd) {
            this.state.bannerAd = window.ttSDK.createBannerAd(
                this.adUnitIds.BANNER_BOTTOM,
                {
                    top: window.innerHeight - 100,
                    left: 0,
                    width: window.innerWidth,
                    height: 100
                }
            );
        }
        
        if (this.state.bannerAd) {
            this.state.bannerAd.show();
            this.state.isBannerVisible = true;
            this.state.totalAdsShown.banner++;
        }
    }

    /**
     * 隐藏Banner广告
     */
    hideBannerAd() {
        if (this.state.bannerAd && this.state.isBannerVisible) {
            this.state.bannerAd.hide();
            this.state.isBannerVisible = false;
        }
    }

    /**
     * 销毁Banner广告
     */
    destroyBannerAd() {
        if (this.state.bannerAd) {
            this.state.bannerAd.destroy();
            this.state.bannerAd = null;
            this.state.isBannerVisible = false;
        }
    }

    /**
     * 检查是否可以使用广告功能
     */
    isAdReady() {
        return window.ttSDK && window.ttSDK.isReady;
    }

    /**
     * 配置广告单元ID
     */
    setAdUnitIds(adUnitIds) {
        this.adUnitIds = { ...this.adUnitIds, ...adUnitIds };
        console.log('[AdsManager] Ad unit IDs updated');
    }

    /**
     * 获取广告统计信息
     */
    getStats() {
        return {
            state: this.state,
            config: this.config,
            isReady: this.isAdReady(),
            sdkStatus: window.ttSDK?.getStatus()
        };
    }
}

// 导出单例
window.adsManager = new AdsManager();