// ==========================================
// 全局背景取色 & 动画控制 & SVG 动态亮度
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    
    // 【终极容错机制】：保证变量有值并强制开机
    const forceStartAnimation = () => {
        const root = document.documentElement;
        if (!root.style.getPropertyValue('--theme-color-1')) {
            root.style.setProperty('--theme-color-1', '#e0e0e0');
            root.style.setProperty('--svg-stroke-color', '#1a1a1a'); // 保底 SVG 深灰色画笔
            console.log('⚠️ 启用系统保底主题色 #e0e0e0');
        }
        
        if (!document.body.classList.contains('anim-start')) {
            document.body.classList.add('anim-start');
            console.log('🎬 强制动画开机！');
        }
    };

    // 双重侦测：先找 web_bg，再找 page-header
    let bgElement = document.getElementById('web_bg'); 
    let bgImage = bgElement ? window.getComputedStyle(bgElement).getPropertyValue('background-image') : 'none';

    if (!bgElement || bgImage === 'none') {
        bgElement = document.getElementById('page-header');
        bgImage = bgElement ? window.getComputedStyle(bgElement).getPropertyValue('background-image') : 'none';
    }

    if (!bgElement || bgImage === 'none') return forceStartAnimation();

    const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
    if (!urlMatch || urlMatch.length < 2) return forceStartAnimation();
    
    const imageUrl = urlMatch[1];
    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    img.src = imageUrl;

    img.onload = function() {
        try {
            const colorThief = new ColorThief();
            const palette = colorThief.getPalette(img, 3);
            
            if (palette && palette.length >= 3) {
                // 提取 RGB 数值
                const r = palette[0][0];
                const g = palette[0][1];
                const b = palette[0][2];
                
                const color1 = `rgb(${r}, ${g}, ${b})`; 
                const color2 = `rgb(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]})`; 
                const color3 = `rgb(${palette[2][0]}, ${palette[2][1]}, ${palette[2][2]})`; 

                // 计算 YIQ 感知亮度 (0-255)
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                // 亮度大于 128 用深色画笔，否则用纯白画笔
                const svgColor = brightness > 128 ? '#1a1a1a' : '#ffffff';

                // 写入全局变量
                const root = document.documentElement;
                root.style.setProperty('--theme-color-1', color1);
                root.style.setProperty('--theme-color-2', color2);
                root.style.setProperty('--theme-color-3', color3);
                root.style.setProperty('--svg-stroke-color', svgColor);
                
                console.log('🌌 背景动态调色板提取成功:');
                console.log('%c 主色 1 ', `background: ${color1}; color: ${svgColor};`);
                console.log(`👁️ 背景亮度: ${brightness}，SVG 设为: ${svgColor}`);
            }
            
            // 提取成功，正常开机
            document.body.classList.add('anim-start');
            console.log('🎬 背景颜色就位，全局动画开机！');
            
        } catch (error) {
            console.error('❌ 取色算法崩溃:', error);
            forceStartAnimation(); 
        }
    };

    img.onerror = function() {
        console.error('❌ 背景图跨域或加载失败');
        forceStartAnimation();
    };
    
    // 超时兜底：5秒强制开机
    setTimeout(forceStartAnimation, 5000);
});