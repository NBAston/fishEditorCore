/***
 *  捕鱼：动画播放器
 * **/
let CONFIGS = require("fishConst");
glGame.movieClip = cc.Class({
    extends: cc.Component,
    properties: {
        movieClipType: {
            default: 1,
            displayName: "类型",
            tooltip: "动画类型 1 鱼 、 2特效",
            type:cc.Integer,
        },
    },
    //初始化图集
    initAtlas(f){
        this.fish_Atlas = f;
    },
    //帧动画播放 atlas 图集 payName前缀 min最小 max最大 loop是否循环 isHaveZero连接符是否带0
    initEffect(atlas,payName,min,max,loop,isHaveZero,speed,isDestroy,callBack = null){
        this.atlas            = atlas;
        this.payName          = payName;
        this.effectIndex      = min;
        this.min              = min;
        this.max              = max;
        this.loop             = loop;
        this.playEffectTime   = 0;
        this.playEffectSpeed  = speed;
        this.isHaveZero       = isHaveZero;
        this.isDestroy        = isDestroy;
        this.callBack         = callBack;
        this.node.getComponent(cc.Sprite).spriteFrame = this.atlas.getSpriteFrame(this.getSprName());
        this.isPlayEffect     = true;
    },
    //动画播放2　：获取图集名字
    getSprName(){
        let sprName;
        if(this.isHaveZero){
            if(this.effectIndex < 10){
                sprName = this.payName+"0"+this.effectIndex;
            }else{
                sprName = this.payName+""+this.effectIndex;
            }
        }else{
            sprName = this.payName+""+this.effectIndex;
        }
        return sprName;
    },
    //缩放动画播放
    initEffectScaleTo(atlas,payName,scaleToTime,scaleX,scaleY,delayTime = 0.3,isDestroy = true,cb = null){
        this.atlas      = atlas;
        this.payName    = payName;
        this.node.getComponent(cc.Sprite).spriteFrame = this.atlas.getSpriteFrame(this.payName);
        this.node.scale = 0;
        this.node.stopAllActions();
        let zIndex      = CONFIGS.nodeZIndex.zIndexPartBoom + Math.ceil(Math.random() * 200);
        this.node.zIndex= zIndex > cc.macro.MAX_ZINDEX ? cc.macro.MAX_ZINDEX -1 : zIndex;
        this.node.runAction(cc.sequence(cc.scaleTo(scaleToTime,scaleX,scaleX),cc.delayTime(delayTime),cc.callFunc(()=>{
            if(isDestroy){
                if(cb)cb();
                this.node.destroy();
            }else{
                if(cb)cb();
                this.node.active = false;
            }
        })));
    },
    //缩放+旋转动画播放
    initEffectScaleAndRotateTo(atlas,payName,rotateTime,scaleToTime,scaleX,scaleY,isDestroy = true,cb = null){
        this.atlas      = atlas;
        this.payName    = payName;
        this.node.getComponent(cc.Sprite).spriteFrame = this.atlas.getSpriteFrame(this.payName);
        this.node.scaleX = scaleX;
        this.node.scaleY = scaleY;
        this.node.stopAllActions();
        let zIndex      = CONFIGS.nodeZIndex.zIndexPartBoom + Math.ceil(Math.random() * 200);
        this.node.zIndex= zIndex > cc.macro.MAX_ZINDEX ? cc.macro.MAX_ZINDEX -1 : zIndex;
        let act = cc.spawn(
            cc.repeat(cc.rotateBy(rotateTime,360),2),
            cc.scaleTo(scaleToTime,0.01,0.01)
        );
        this.node.runAction(cc.sequence(act,cc.callFunc(()=>{
            if(isDestroy){
                if(cb)cb();
                this.node.destroy();
            }else{
                if(cb)cb();
                this.node.active = false;
            }
        })));
    },
    update(dt){
        if(this.isPlayEffect != undefined && this.isPlayEffect == true){
            if(this.loop == 0 || this.loop > 0){
                this.playEffectTime += dt;
                if(this.playEffectTime > this.playEffectSpeed){
                    this.playEffectTime = 0;
                    this.node.getComponent(cc.Sprite).spriteFrame = this.atlas.getSpriteFrame(this.getSprName());
                    this.effectIndex ++;
                    if(this.effectIndex >= this.max){
                        if(this.loop != 0){
                            this.loop --;
                            if(this.loop <= 0){
                                this.loop = -1;
                                this.isPlayEffect = false;
                                this.node.active = false;
                            }else{
                                this.effectIndex = this.min;
                            }
                        }else if(this.loop == 0){
                            if(this.effectIndex >this.max){
                                this.effectIndex = this.min;
                            }
                        }
                    }
                }
            }else{
                if(this.callBack){
                    this.callBack();
                }
                if(this.isDestroy){
                    this.node.destroy();
                }else{
                    this.loop = -1;
                    this.isPlayEffect = false;
                    this.node.active = false;
                }
            }
        }
    },
    //初始化动画播放器
    initFishMovieClip () {
        // this.logic          = require("fishlogic").getInstance();//数据中心
        this.lineID         = null; //鱼id
        this.fishMoveTimeId = 0;    //动画计时器
        this.runfrequency   = 10;   //动画计时器
        this.runSpeed       = 0.013 * this.runfrequency; //每帧大概速度是 0.0166
        this.isStart        = false;//是否开始播放
        this.data           = null; //基础数据
        this.index          = 0;    //当前播放第几个图
        this.MaxIndex       = 0;    //最多几个图
        this.mcBaseName     = null; //基础名称
        this.currAtl        = null; //当前选用的图集
    },
    //动画帧频
    updateFrequency (frequency) {
        this.runSpeed = frequency;
    },
    //设置信息
    setFIsh(res){
        this.data       = res;
        this.index      = 1;
        this.mcBaseName = this.data.filename+"_move";
        let spriteFrame = this.getImg();
        this.initSpr(spriteFrame);
        this.node.setScale(this.editScale);
        this.isStart    = true;
    },
    //设置 编辑 界面显示的 信息
    setResFIsh(filename){
        this.filename = filename;
        this.index       = 1;
        this.mcBaseName  = this.filename+"_move";
        let spriteFrame  = this.getImg();
        let scale        = this.maxW / spriteFrame.getOriginalSize().width;
        this.node.width  = spriteFrame.getOriginalSize().width * scale;
        this.node.height = spriteFrame.getOriginalSize().height * scale;
        this.initSpr(spriteFrame);
        this.node.setScale(this.editScale);
        this.isStart    = true;
    },
    //播放
    playFishMovieClip(dt){
        if(this.isStart && this.lineID !== undefined){
            this.fishMoveTimeId += dt;
            if(this.fishMoveTimeId > this.runSpeed){
                let spriteFrame = this.getImg();
                if(!spriteFrame){
                    if(this.MaxIndex === 0){
                        this.MaxIndex = this.index;
                    }
                    this.index = 1;
                    spriteFrame = this.getImg();
                }
                this.initSpr(spriteFrame);
                this.index ++;
                if(this.MaxIndex !== 0 && this.index >= this.MaxIndex){
                    this.index = 1;
                }
                this.fishMoveTimeId = 0;
            }
        }
    },
    //设置帧动画
    getImg(){
        let spriteFrame = this.getSpriteAtlas(this.mcBaseName + this.index);
        if(spriteFrame == null && this.index == 1){
            console.error("找不到鱼图 frameName: "+this.mcBaseName + this.index," data ",this.data);
            this.mcBaseName ="fish1_move";
            this.index = 1;
            return spriteFrame = this.getSpriteAtlas(this.mcBaseName + this.index);
        }
        return spriteFrame;
    },
    //初始化图片
    initSpr(spriteFrame){
        this.node.getComponent(cc.Sprite).spriteFrame = spriteFrame;//目前只有正常鱼
    },
    //从图集获取图片
    getSpriteAtlas(frameName){
        if(this.fish_Atlas != null){
            if(this.currAtl && this.fish_Atlas[this.currAtl].getSpriteFrame(frameName) != null){
                return this.fish_Atlas[this.currAtl].getSpriteFrame(frameName);
            }
            let length = this.fish_Atlas.length;
            let sprFrame;
            for (let i = 0;i<length;i++){
                sprFrame = this.fish_Atlas[i].getSpriteFrame(frameName);
                if(sprFrame){
                    this.currAtl = i;
                    return sprFrame;
                }
            }
        }else{
            return glGame.getAtlasForTexture(this.filename,frameName);
        }
    },
    OnDestroy() {
        // this.logic          = null;
        this.lineID         = null;
        this.fishMoveTimeId = 0;
        this.runSpeed       = 0;
        this.isStart        = false;
        this.data           = null;
        this.index          = 0;
        this.mcBaseName     = null;
        this.currAtl        = null;
    },
});