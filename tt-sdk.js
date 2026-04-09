/**
 * TikTok SDK 封装层
 * TikTok Mini Game SDK Wrapper
 */

class TikTokSDK {
    constructor() {
        this.platform = 'tiktok';
        this.isReady = false;
        this.systemInfo = null;
        this.adCache = {};
        this.eventQueue = [];
    }

    /**
     * 初始化SDK
     * Initialize SDK
     */
    init() {
        return new Promise((resolve, reject) => {
            // 检查是否在TikTok环境中
            if (!this.isTikTokEnvironment()) {
                console.warn('[TikTokSDK] Not in TikTok environment, using mock mode');
                this.isReady = true;
                this._processEventQueue();
                resolve({ mode: 'mock', message: 'Using mock mode for development' });
                return;
            }

            // 等待TTJSBridge准备就绪
            if (window.TTJSBridge && window.TTJSBridge.ready) {
                window.TTJSBridge.ready(() => {
                    this.isReady = true;
                    this.getSystemInfo();
                    this._processEventQueue();
                    console.log('[TikTokSDK] Initialized successfully');
                    resolve({ mode: 'tiktok', message: 'TikTok SDK ready' });
                });
            } else {
                // 延迟检查
                setTimeout(() => {
                    if (window.TTJSBridge) {
                        window.TTJSBridge.ready(() => {
                            this.isReady = true;
                            this.getSystemInfo();
                            this._processEventQueue();
                            console.log('[TikTokSDK] Initialized successfully (delayed)');
                            resolve({ mode: 'tiktok', message: 'TikTok SDK ready' });
                        });
                    } else {
                        console.warn('[TikTokSDK] TTJSBridge not found, using mock mode');
                        this.isReady = true;
                        this._processEventQueue();
                        resolve({ mode: 'mock', message: 'Using mock mode - TTJSBridge not available' });
                    }
                }, 1500);
            }
        });
    }

    /**
     * 检查是否在TikTok环境中
     * Check if running in TikTok environment
     */
    isTikTokEnvironment() {
        if (typeof window === 'undefined') return false;
        
        const userAgent = navigator.userAgent || '';
        const isTikTokUA = /TikTok|ttwebview|Bytedance/i.test(userAgent);
        const hasBridge = !!window.TTJSBridge;
        
        return isTikTokUA || hasBridge;
    }

    /**
     * 获取系统信息
     * Get system information
     */
    getSystemInfo() {
        if (!this.isReady || !window.TTJSBridge) {
            this.systemInfo = {
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                pixelRatio: window.devicePixelRatio || 1,
                platform: 'web'
            };
            return this.systemInfo;
        }

        try {
            this.systemInfo = window.TTJSBridge.getSystemInfoSync();
            return this.systemInfo;
        } catch (e) {
            console.error('[TikTokSDK] Failed to get system info:', e);
            return null;
        }
    }

    /**
     * 短震动
     * Short vibration
     */
    vibrateShort() {
        if (this.isReady && window.TTJSBridge) {
            try {
                window.TTJSBridge.vibrateShort({ type: 'light' });
            } catch (e) {
                // Silent fail
            }
        }
    }

    /**
     * 长震动
     * Long vibration
     */
    vibrateLong() {
        if (this.isReady && window.TTJSBridge) {
            try {
                window.TTJSBridge.vibrateLong();
            } catch (e) {
                // Silent fail
            }
        }
    }

    /**
     * 预加载激励视频广告
     * Preload rewarded video ad
     */
    preloadRewardedVideoAd(adUnitId) {
        if (!this.isReady || !window.TTJSBridge) {
            return Promise.resolve({ success: false, mode: 'mock' });
        }

        return new Promise((resolve) => {
            try {
                const rewardedVideoAd = window.TTJSBridge.createRewardedVideoAd({ adUnitId });
                
                rewardedVideoAd.onLoad(() => {
                    this.adCache[adUnitId] = rewardedVideoAd;
                    resolve({ success: true });
                });

                rewardedVideoAd.onError((err) => {
                    console.error('[TikTokSDK] Rewarded ad preload error:', err);
                    resolve({ success: false, error: err });
                });

                // Load the ad
                rewardedVideoAd.load().catch(() => {
                    resolve({ success: false });
                });
            } catch (e) {
                resolve({ success: false, error: e });
            }
        });
    }

    /**
     * 显示激励视频广告
     * Show rewarded video ad
     */
    showRewardedVideoAd(adUnitId) {
        return new Promise((resolve) => {
            if (!this.isReady || !window.TTJSBridge) {
                console.log('[TikTokSDK] Mock rewarded video ad');
                // 模拟广告播放 - 开发测试用
                setTimeout(() => {
                    resolve({ 
                        isEnded: true, 
                        mode: 'mock',
                        message: 'Mock ad completed' 
                    });
                }, 2000);
                return;
            }

            // 使用缓存的广告或创建新的
            let rewardedVideoAd = this.adCache[adUnitId];
            
            if (!rewardedVideoAd) {
                rewardedVideoAd = window.TTJSBridge.createRewardedVideoAd({ adUnitId });
            }

            let hasRewarded = false;
            let hasClosed = false;

            rewardedVideoAd.onLoad(() => {
                console.log('[TikTokSDK] Rewarded video ad loaded');
            });

            rewardedVideoAd.onError((err) => {
                console.error('[TikTokSDK] Rewarded video ad error:', err);
                if (!hasClosed) {
                    hasClosed = true;
                    resolve({ isEnded: false, error: err });
                }
            });

            rewardedVideoAd.onClose((res) => {
                if (!hasClosed) {
                    hasClosed = true;
                    // 用户点击了【关闭广告】按钮
                    if (res && res.isEnded) {
                        // 正常播放结束，可以下发奖励
                        hasRewarded = true;
                        resolve({ isEnded: true });
                    } else {
                        // 播放中途退出，不下发奖励
                        resolve({ isEnded: false });
                    }
                    // 清除缓存
                    delete this.adCache[adUnitId];
                }
            });

            // 显示广告
            const showAd = () => {
                rewardedVideoAd.show().catch((err) => {
                    console.error('[TikTokSDK] Show ad failed, trying to load:', err);
                    // 失败重试
                    rewardedVideoAd.load().then(() => {
                        rewardedVideoAd.show();
                    }).catch((loadErr) => {
                        if (!hasClosed) {
                            hasClosed = true;
                            resolve({ isEnded: false, error: loadErr });
                        }
                    });
                });
            };

            // 如果已缓存直接显示，否则先加载
            if (this.adCache[adUnitId]) {
                showAd();
            } else {
                rewardedVideoAd.load().then(showAd).catch((err) => {
                    if (!hasClosed) {
                        hasClosed = true;
                        resolve({ isEnded: false, error: err });
                    }
                });
            }
        });
    }

    /**
     * 显示插屏广告
     * Show interstitial ad
     */
    showInterstitialAd(adUnitId) {
        return new Promise((resolve) => {
            if (!this.isReady || !window.TTJSBridge) {
                console.log('[TikTokSDK] Mock interstitial ad');
                setTimeout(() => {
                    resolve({ showed: true, mode: 'mock' });
                }, 1000);
                return;
            }

            const interstitialAd = window.TTJSBridge.createInterstitialAd({ adUnitId });
            let hasResolved = false;

            interstitialAd.onLoad(() => {
                console.log('[TikTokSDK] Interstitial ad loaded');
            });

            interstitialAd.onError((err) => {
                console.error('[TikTokSDK] Interstitial ad error:', err);
                if (!hasResolved) {
                    hasResolved = true;
                    resolve({ showed: false, error: err });
                }
            });

            interstitialAd.onClose(() => {
                if (!hasResolved) {
                    hasResolved = true;
                    resolve({ showed: true });
                }
            });

            interstitialAd.show().catch((err) => {
                // 失败重试
                interstitialAd.load().then(() => {
                    interstitialAd.show();
                }).catch((loadErr) => {
                    if (!hasResolved) {
                        hasResolved = true;
                        resolve({ showed: false, error: loadErr });
                    }
                });
            });
        });
    }

    /**
     * 创建Banner广告
     * Create banner ad
     */
    createBannerAd(adUnitId, style = {}) {
        if (!this.isReady || !window.TTJSBridge) {
            console.log('[TikTokSDK] Mock banner ad');
            return {
                show: () => {},
                hide: () => {},
                destroy: () => {},
                mode: 'mock'
            };
        }

        const defaultStyle = {
            left: 0,
            top: this.systemInfo?.windowHeight - 100 || window.innerHeight - 100,
            width: this.systemInfo?.windowWidth || window.innerWidth,
            height: 100
        };

        try {
            const bannerAd = window.TTJSBridge.createBannerAd({
                adUnitId: adUnitId,
                style: { ...defaultStyle, ...style }
            });

            return bannerAd;
        } catch (e) {
            console.error('[TikTokSDK] Create banner ad failed:', e);
            return null;
        }
    }

    /**
     * 分享游戏
     * Share game
     */
    shareGame(customData = {}) {
        const defaultData = {
            title: '🎮 Color Match - Can you beat my score?',
            desc: `I scored ${window.game?.score || 0} points! Think you can do better?`,
            imageUrl: '', // 分享图片URL
            query: `score=${window.game?.score || 0}&level=${window.game?.level || 1}`
        };

        const shareData = { ...defaultData, ...customData };

        if (!this.isReady || !window.TTJSBridge) {
            console.log('[TikTokSDK] Mock share:', shareData);
            // 模拟分享
            if (navigator.share) {
                return navigator.share({
                    title: shareData.title,
                    text: shareData.desc,
                    url: window.location.href
                }).then(() => ({ success: true }))
                .catch(() => ({ success: false, cancelled: true }));
            }
            return Promise.resolve({ success: true, mode: 'mock' });
        }

        return new Promise((resolve) => {
            try {
                window.TTJSBridge.shareAppMessage(shareData);
                resolve({ success: true });
            } catch (e) {
                console.error('[TikTokSDK] Share failed:', e);
                resolve({ success: false, error: e });
            }
        });
    }

    /**
     * 上报游戏事件（用于数据分析）
     * Report analytics event
     */
    reportEvent(eventName, params = {}) {
        const eventData = {
            event: eventName,
            params: params,
            timestamp: Date.now()
        };

        console.log('[TikTokSDK] Event:', eventData);

        if (!this.isReady) {
            // 如果SDK还没准备好，加入队列
            this.eventQueue.push(eventData);
            return;
        }

        this._sendEvent(eventData);
    }

    _sendEvent(eventData) {
        if (this.isReady && window.TTJSBridge && window.TTJSBridge.reportAnalytics) {
            try {
                window.TTJSBridge.reportAnalytics(eventData.event, eventData.params);
            } catch (e) {
                // Silent fail
            }
        }
    }

    _processEventQueue() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this._sendEvent(event);
        }
    }

    /**
     * 游戏开始时调用
     * Called when game starts
     */
    onGameStart() {
        this.reportEvent('game_start', {
            timestamp: Date.now()
        });
    }

    /**
     * 游戏结束时调用
     * Called when game ends
     */
    onGameEnd(score, level, coins = 0) {
        this.reportEvent('game_end', {
            score: score,
            level: level,
            coins: coins,
            duration: window.game?.playTime || 0
        });
    }

    /**
     * 用户点击广告时调用
     * Called when user clicks ad
     */
    onAdClick(adType, adUnitId = '') {
        this.reportEvent('ad_click', {
            type: adType,
            adUnitId: adUnitId
        });
    }

    /**
     * 关卡完成时调用
     * Called when level completed
     */
    onLevelComplete(level, score) {
        this.reportEvent('level_complete', {
            level: level,
            score: score
        });
    }

    /**
     * 获取当前状态
     * Get current status
     */
    getStatus() {
        return {
            isReady: this.isReady,
            platform: this.platform,
            isTikTokEnv: this.isTikTokEnvironment(),
            systemInfo: this.systemInfo,
            cachedAds: Object.keys(this.adCache)
        };
    }
}

// 导出单例
window.ttSDK = new TikTokSDK();