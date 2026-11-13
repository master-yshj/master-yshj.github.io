document.addEventListener('DOMContentLoaded', function() {
    // 1. 获取所有的头像图片
    const avatarImgs = document.querySelectorAll('.avatar-img img'); 
    if (avatarImgs.length === 0) return;

    // 2. 遍历每个头像进行独立处理
    avatarImgs.forEach((avatarImg, index) => {
        // 找到这个头像所属的最外层卡片容器 (根据你的情况是 .card-author 或 .card-info)
        const cardContainer = avatarImg.closest('.card-author') || avatarImg.closest('.card-info') || avatarImg.parentElement;

        const forceSetAvatarColors = () => {
            if (!cardContainer.style.getPropertyValue('--avatar-color-1')) {
                cardContainer.style.setProperty('--avatar-color-1', '#00d2ff');
                cardContainer.style.setProperty('--avatar-color-2', '#ff007c');
                cardContainer.style.setProperty('--avatar-color-3', '#e0e0e0');
            }
        };

        if (!avatarImg.src) return forceSetAvatarColors();

        const img = new Image();
        img.crossOrigin = 'Anonymous'; 
        img.src = avatarImg.src;

        img.onload = function() {
            try {
                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 3);
                
                if (palette && palette.length >= 3) {
                    const color1 = `rgb(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]})`; 
                    const color2 = `rgb(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]})`; 
                    const color3 = `rgb(${palette[2][0]}, ${palette[2][1]}, ${palette[2][2]})`; 

                    // 核心修改：把颜色变量写到 cardContainer 上，而不是 documentElement
                    cardContainer.style.setProperty('--avatar-color-1', color1);
                    cardContainer.style.setProperty('--avatar-color-2', color2);
                    cardContainer.style.setProperty('--avatar-color-3', color3);
                    
                    console.log(`卡片 ${index + 1} 颜色提取完成`);
                } else {
                    forceSetAvatarColors();
                }
            } catch (error) {
                console.error(`卡片 ${index + 1} 取色崩溃:`, error);
                forceSetAvatarColors(); 
            }
        };

        img.onerror = function() {
            forceSetAvatarColors();
        };
        
        setTimeout(forceSetAvatarColors, 3000);
    });
});