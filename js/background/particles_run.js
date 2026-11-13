document.addEventListener('DOMContentLoaded', function() {
    // 常用性能参数：桌面端 48 个粒子，手机/触摸设备 24 个。
    const lightMode = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    const particleCount = lightMode ? 24 : 48;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (typeof tsParticles === 'undefined') {
        console.error('❌ tsParticles 引擎未加载');
        return;
    }

    // 将画布限制在页头内，缺少容器时不启动。
    const header = document.getElementById('page-header');
    const pContainer = document.getElementById('particles-container');

    if (!header || !pContainer) return;
    header.insertBefore(pContainer, header.firstChild);

    // 等待取色完成，最多等待 6 秒，避免取色脚本失败后一直轮询。
    let readyChecks = 0;
    const checkReadyInterval = setInterval(() => {
        if (document.body.classList.contains('anim-start') || ++readyChecks >= 60) {
            clearInterval(checkReadyInterval);
            initParticles(); // 颜色就位，点火渲染！
        }
    }, 100);

    // 【核心步骤 3】：参数化渲染
    function initParticles() {
        const root = document.documentElement;
        const color1 = root.style.getPropertyValue('--theme-color-1').trim() || "#00d2ff";
        const color2 = root.style.getPropertyValue('--theme-color-2').trim() || "#ff007c";
        const color3 = root.style.getPropertyValue('--theme-color-3').trim() || "#ffffff";

        tsParticles.load("particles-container", {
            fullScreen: { enable: false },
            background: { color: { value: "transparent" } },
            fpsLimit: 30,
            detectRetina: false,
            pauseOnBlur: true,
            pauseOnOutsideViewport: true,
            
            particles: {
                color: { value: [color1, color2, color3] },
                
                number: {
                    value: particleCount,
                    limit: particleCount,
                    density: { enable: false }
                },
                
                shadow: {
                    enable: false
                },

                move: {
                    enable: true,
                    speed: 1.2,
                    direction: "none",
                    random: true,
                    straight: false,
                    outModes: { default: "bounce" }
                },
                
                opacity: {
                    value: { min: 0.3, max: 0.8 },
                    animation: { enable: !lightMode, speed: 1.5, minimumValue: 0.1, sync: false }
                },
                
                shape: { type: "circle" },
                
                size: {
                    value: { min: 1.5, max: 4 }, 
                    animation: { enable: false }
                },
                
                links: {
                    enable: !lightMode,
                    distance: 80,
                    color: color1,
                    opacity: 0.4,
                    width: 1,
                    shadow: { enable: false }
                }
            },
            
            // 官方提供的正规穿透交互方案：监听 window
            interactivity: {
                detectsOn: "window", 
                events: {
                    onHover: { enable: !lightMode, mode: "repulse" },
                    resize: true
                },
                modes: {
                    repulse: { distance: 120, duration: 0.4, factor: 100 }
                }
            }
        }).catch(error => console.warn('粒子效果初始化失败:', error));
    }
});
