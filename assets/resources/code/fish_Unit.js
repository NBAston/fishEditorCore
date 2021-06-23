/***
 *  捕鱼：鱼，初始化 播放图片、移动（同步状态）
 * **/
let CONST = require("fishConst");
glGame.movieClip.extend({
    properties: {
        resID : "?",
        resType : 0,
    },
    onLoad () {
        this.initFishMovieClip(0.1);//调用基类的初始化动画方法
        this.whirlpool= null;
        this.fishData = null;
        this.fishLine = null;
        this.fishPath = null;
        this._bUpdate = false;
        this.timeIndex= 0;
        this.moveList = null;
        this.posArray = null;
        this.isHit    = false;
        this.hitTime  = 0;
        this.delayedPause = 0;
        // this.isPlayStartMc = false;
        this.isMouseDown = false;
    },

    //初始化鱼，状态同步中心
    initFish(fishData){
        this.fishData     = fishData;
        this.moveList     = this.fishData.moveList;
        this.posArray     = this.fishData.posArray;
        this.showTime     = this.fishData.showTime;//配置表默认值
        this.runTime      = this.fishData.runTime;//总时间
        if(this.fishData.frequency != undefined){
            this.runSpeed     = this.fishData.frequency;
            cc.error(">> 初始化鱼，状态同步中心 "+this.runSpeed)
        }
        this._startTime   = (fishData.serverTime - fishData.createTime)/1000;//已经出生 ， 状态同步,包含显示时间,显示时间不参与移动
        if(this._startTime < 0){
            this.showTime += Math.abs(Number(this._startTime+""));
            this._startTime = 0;
        }
        this._allTime = this.runTime+this.showTime
        if(this._startTime >= this._allTime){//超时 直接死亡
            this.death(CONST.dieType0);
            return;
        }
        if(this._startTime >= this.showTime){//出生值 >= 显示值
            if(this.showTime > 0){
                this._startTime -= this.showTime;
            }
            this._bUpdate     = true;
            this.startMove();//直接开始移动
        }else{
            this.node.getComponent(cc.Sprite).enabled = false;
            this.showTime -= Number(this._startTime + "");//等一会在移动
            this._startTime -= Number(this._startTime + "");//等一会在移动
            if(this._startTime < 0){
                this._startTime = 0;
            }
            this._bUpdate     = true;
        }
        this.fishData.res = this.resID;
        this._time = Date.now();
        this.node.x = this.posArray[0].x;
        this.node.y = this.posArray[0].y;
        // let fishLocalData = this.logic.json_fishConfig[this.fishData.FishId];
        let fishLocalData = {'level':100};
        let zIndex = CONST.nodeZIndex.zIndexFish + (Number(fishLocalData.level) + Math.ceil(Math.random() * 30));
        this.node.zIndex = zIndex > cc.macro.MAX_ZINDEX ? cc.macro.MAX_ZINDEX -1 : zIndex;
    },
    setTips(){
        let lab_desc_id = glGame.editor.node.getChildByName("tips").getChildByName("layout").getChildByName("lab_desc_id");
        let lab_id = glGame.editor.node.getChildByName("tips").getChildByName("layout").getChildByName("lab_id");
        this.node.on(cc.Node.EventType.MOUSE_ENTER, (event) => {
                glGame.editor.node.getChildByName("tips").active = true;
                lab_id.active  = true;
                let data = glGame.fishTable[Number(this.node.fishTypeId)];
                lab_desc_id.getComponent(cc.Label).string = "fishTypeId:"+data.fishTypeId;
                glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_d").getComponent(cc.Label).string = data.fishName+"";
                glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_d").active = true;
                glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_desc").active = true;
                glGame.editor.node.getChildByName("tips").getChildByName("bg").height = 150;
                glGame.editor.node.getChildByName("tips").getChildByName("bg").width = 300;
        }, this.node);

        this.node.on(cc.Node.EventType.MOUSE_MOVE, (event) => {
            let pos  = glGame.editor.node.convertToNodeSpaceAR(event.getLocation());
            pos.x -= 10;
            glGame.editor.node.getChildByName("tips").setPosition(pos);
        }, this.node);

        this.node.on(cc.Node.EventType.MOUSE_LEAVE, (event) => {
            glGame.editor.node.getChildByName("tips").active = false;
        }, this.node);
    },
    start(){
        if(this.node.name.indexOf("resList_fish_") != -1) {//编辑资源
            this.setTips();
        }
        // 鼠标按下
        this.node.on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            // 鼠标左键
            if (event.getButton() == cc.Event.EventMouse.BUTTON_LEFT) {
                event.stopPropagation();
                if(this.node.name.indexOf("resList_fish_") != -1){//编辑资源
                    //编辑资源 模式就 赋值选中当前的鱼的颜色
                    if(glGame.currentEditFish != null){
                        glGame.currentEditFish.node.color = cc.color(255,255,255,255);
                    }
                    glGame.currentEditFish = this;
                    glGame.currentEditFish.node.color = cc.color(190,0,0,255);
                }else{
                    if(this.node.name != "fish"){
                        this.isMouseDown = true;
                    }
                }
            }
            // 鼠标右键
            if (event.getButton() == cc.Event.EventMouse.BUTTON_RIGHT) {
                if(this.node.name != "fish"){
                    if(glGame.currLineItem && glGame.currLineItem.lineID != this.node.lineID && glGame.FList[glGame.currGIndex].fishLine[this.node.lineID] != null){
                        glGame.currLineItem = glGame.FList[glGame.currGIndex].fishLine[this.node.lineID];
                        glGame.editor.updateFishLineToCanvas(null,this.node.lineID);
                        event.stopPropagation();
                    }
                }
            }
        });

        let move = (event) => {
            let delta = event.getDelta();
            if(this.isMouseDown){
                this.node.x += delta.x;
                this.node.y += delta.y;
                cc.game.canvas.style.cursor = "all-scroll";
                let moveTargetNode = glGame.drawBezier.node.getChildByName("point_0");
                if(moveTargetNode){
                    let mousePos = this.convertToNodeSpace(event);
                    lcl.Events.emit("setMouseLocation", mousePos);
                    moveTargetNode.opacity = 100;
                    cc.game.canvas.style.cursor = "all-scroll";
                    //鼠标按下并且有指定目标节点
                    if (moveTargetNode) {
                        //把屏幕坐标转换到节点坐标下
                        let mousePos = this.convertToNodeSpace(event);
                        moveTargetNode.setPosition(mousePos);
                    }
                }
            }
        }
        //鼠标移动
        this.node.parent.on(cc.Node.EventType.MOUSE_MOVE, move);
        this.node.on(cc.Node.EventType.MOUSE_MOVE, move);
        let up = (event) => {
            this.isMouseDown = false;
            cc.game.canvas.style.cursor = "auto";
        }
        // 鼠标抬起
        this.node.on(cc.Node.EventType.MOUSE_UP, up);
        this.node.parent.on(cc.Node.EventType.MOUSE_UP, up);

        this.node.on(cc.Node.EventType.MOUSE_ENTER, (event) => {
            glGame.editor.node.getChildByName("tips").active = true;
            let fishResInfo = glGame.editor.getFishResConfig(this.node.filename);
            if (!fishResInfo) {
                glGame.editor.status("找不到资源配置", glGame.Color.RED);
            }
            let lab_desc_id = glGame.editor.node.getChildByName("tips").getChildByName("layout").getChildByName("lab_desc_id");
            let lab_id = glGame.editor.node.getChildByName("tips").getChildByName("layout").getChildByName("lab_id");
            if (fishResInfo) {
                lab_desc_id.getComponent(cc.Label).string = "FishId:" + fishResInfo.lineID;
            }
            if (glGame.FList[glGame.currGIndex] != null && glGame.FList[glGame.currGIndex].fishLine != null) {
                let info2 = glGame.FList[glGame.currGIndex].fishLine[this.node.lineID] ? glGame.FList[glGame.currGIndex].fishLine[this.node.lineID] : null;
                let rate = info2 ? info2.rate : -1;
                if (fishResInfo) glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_d").getComponent(cc.Label).string = fishResInfo.FishName + "(" + rate + "s) 缩放:" + this.editScale;
            } else {
                if (fishResInfo) glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_d").getComponent(cc.Label).string = fishResInfo.FishName;
            }
            lab_id.active = this.showTime != undefined && this.showTime != 0;
            if (this.showTime != undefined && this.showTime != 0) {
                lab_id.getComponent(cc.Label).string = "t:" + this.showTime.toFixed(2);
            }
            glGame.editor.node.getChildByName("tips").getChildByName("bg").height = 80;
        }, this.node);

        this.node.on(cc.Node.EventType.MOUSE_MOVE, (event) => {
            let pos  = glGame.editor.node.convertToNodeSpaceAR(event.getLocation());
                pos.x = pos.x+glGame.editor.node.getChildByName("tips").width + 59;
                glGame.editor.node.getChildByName("tips").setPosition(pos);
        }, this.node);

        this.node.on(cc.Node.EventType.MOUSE_LEAVE, (event) => {
            glGame.editor.node.getChildByName("tips").active = false;
        }, this.node);
    },
    // 屏幕坐标转换到节点坐标
    convertToNodeSpace(event) {
        return cc.find("Canvas").convertToNodeSpaceAR(event.getLocation());
    },
    //死亡 - 开始 dieType: 0 自然死亡 1玩家攻击 2全屏炸弹 3闪电  4旋涡
    death(dieType,isOne = true){
        glGame.editor.node.getChildByName("fishGroupProgress").getChildByName("slider").lineID = null;
        this._bUpdate = false;
        glGame.pearssPush = null;
        glGame.editor.node.getChildByName("editBar").getChildByName("btn_pay").active = true;
        glGame.editor.node.getChildByName("editBar").getChildByName("btn_push").active = false;
        if(isOne){
            return;
        }
        if(dieType == CONST.dieType1){
            let oldAngle = this.node.angle + "";
            let angle = this.node.angle >　0 ? this.node.angle - 20 : this.node.angle + 20;
            let act = cc.sequence(
                cc.rotateTo(0.1,angle),
                cc.rotateTo(0.1,Number(oldAngle))
            );
            this.node.stopAllActions();
            this.node.runAction(cc.sequence(cc.repeat(act,2),cc.callFunc(()=>{
                this.dispose();
            })));
        }else if(dieType == CONST.dieType4){
            this.node.stopAllActions();
            let act = cc.spawn(
                cc.scaleTo(2,0.01,0.01),
                cc.repeat(cc.rotateBy(0.5,360),5),
                cc.sequence(
                    cc.moveTo(0.6,this.node.x + 9,this.node.y - 9),
                    cc.moveTo(0.6,this.node.x - 9,this.node.y + 9),
                )
            );
            this.node.runAction(cc.sequence(act,cc.callFunc(()=>{
                this.dispose();
            })));
        }else{
            this.dispose();
        }
    },
    //卸载自己
    dispose(){
        this._bUpdate = false;
        glGame.pearssPush = null;
        this.node.off(cc.Node.EventType.TOUCH_START);
        this.fishData = null;
        this.fishLine = null;
        this.fishPath = null;
        this.timeIndex= 0;
        this.moveList = null;
        this.posArray = null;
        if(this.whirlpool)this.whirlpool.destroy();
        this.node.destroy();
    },
    //冰冻/解冻
    settingIcing(isInFreeze){
        if(isInFreeze){
            this._time = Date.now();
        }
        this._bUpdate = isInFreeze;
    },
    getPostFormPath(i){
        let startPos = cc.v2(
            this.path[i]["start"].x,
            this.path[i]["start"].y
        )
        let controlPos = cc.v2(
            this.path[i]["control"].x,
            this.path[i]["control"].y
        )
        let endPos = cc.v2(
            this.path[i]["end"].x,
            this.path[i]["end"].y
        )
        return {startPos:startPos,controlPos:controlPos,endPos:endPos}
    },
    //初始化鱼 - 仅限编辑器
    initEditorFish(resGroupId,restype,scale =1,frequency = glGame.runSpeed){
        this.editScale      = scale;
        this.filename       = "fish"+resGroupId;
        this.resType        = restype;
        this.fishPath       = {type:2,liveTime:Math.random() * 20000 + 1000};
        this.fishLine       = this.fishPath;
        this.fishData       = {filename:this.filename};
        this.setFIsh(this.fishData);
        this.runSpeed       = frequency;
        this.isPlayStartMc  = true;
        this.showTime       = 0;
    },
    //资源编辑
    initResEditorFish(filename,maxW,scale =1,frequency = glGame.runSpeed){
        this.editScale      = scale;
        this.maxW           = maxW;
        this.setResFIsh(filename);
        this.runSpeed       = frequency;
        this.isPlayStartMc  = true;
        this.showTime       = 0;
        this.fishData       = {fileName:filename};
    },
    updateData(){
        let info = glGame.FList[glGame.currGIndex].fishLine[this.node.lineID];
        this.moveList = info.moveList;
        this.posArray = info.posArray;
        let baseFrameRate   = Number(glGame.editor.getFishResConfig(Number(info.fishTypeId)).frameRate);//动态获取频率 * 倍率
        this.updateFrequency(baseFrameRate * info.frequency * 10);
    },
    //设置移动数据 - 贝塞尔点以及 移动数据
    setMoveData(fishLine){
        this.posArray = fishLine.posArray;
        this.moveList = fishLine.moveList;
        this.showTime = fishLine.showTime;
    },
    editMove(){
        let info = glGame.FList[glGame.currGIndex].fishLine[this.node.lineID];
        this.moveList = info.moveList;
        this.posArray = info.posArray;
        this.showTime = info.showTime;
        this.startMove();
    },
    getRunTime(){
        let info = glGame.FList[glGame.currGIndex].fishLine[this.node.lineID];
        this.moveList = info.moveList;
        this.posArray = info.posArray;
        this.showTime = info.showTime;
        return this.getMaxIndexByTime();
    },
    startMove(isset = false){
        this._runTimeALl = 0;
        this._startTime = 0
        this._time = Date.now();
        this.node.x = this.posArray[0].x;
        this.node.y = this.posArray[0].y;
        this._bUpdate = true;
        this.allTime = this.getMaxIndexByTime();
        this.at = 0;
        if(isset){
            glGame.editor.node.getChildByName("fishGroupProgress").getChildByName("slider").lineID = this.node.lineID;
        }
        let info = glGame.FList[glGame.currGIndex].fishLine[this.node.lineID];
        let baseFrameRate   = Number(glGame.editor.getFishResConfig(Number(info.fishTypeId)).frameRate);//动态获取频率 * 倍率
        this.updateFrequency(baseFrameRate * info.frequency * 10);
    },
    setProgress(progress){
        this._startTime = progress*this.allTime;
        this._time = Date.now();
        this.delayedPause = 1;
        this._bUpdate = true;
    },
    //获取时间下标
    getMaxIndexByTime() {
        let timeIndex = 0;
        let startTime = 0;
        let nowTime = 0;
        while (true){
            timeIndex = this.getIndexByTime(startTime);
            if(timeIndex == -1){
                break;
            }
            let i = timeIndex > 0 ?  3 * timeIndex : 2 * timeIndex;
            let a = this.posArray[i];
            if(!a){//拿不到数据，到尽头了，销毁
                break;
            }
            startTime = startTime + 0.017;
            nowTime+=0.017;
        }
        return nowTime;
    },
    move(dt){
        //开始移动
        if (this._bUpdate && this.moveList && this.showTime > -1){
            this.showTime -= dt;
            if(this.showTime<=0){
                this._startTime = 0
                this._time = Date.now();
                this.showTime = -1;
            }
        }
        //移动
        if (this._bUpdate && this.moveList && this.showTime <= 0) {
            let l_time = Date.now()
            this._startTime = this._startTime + (l_time - this._time) / 1000;
            this._time = l_time
            if (this.fishPath.type == 2) {//二阶贝塞尔曲线运动
                // cc.log("==== ",this._startTime)
                this.timeIndex = this.getIndexByTime(this._startTime);
                let isr = false;
                if(glGame.editor.node.getChildByName("fishGroupProgress").isGroupPlay){
                    if(glGame.editor.node.getChildByName("fishGroupProgress").getChildByName("slider").lineID == this.node.lineID){
                        isr = true;
                    }
                }else{
                    isr = true;
                }
                if(isr){
                    let progress = this._startTime/this.allTime;
                    glGame.editor.node.getChildByName("fishGroupProgress").getChildByName("slider").getComponent(cc.Slider).progress = progress;
                    glGame.editor.node.getChildByName("fishGroupProgress").getChildByName("progressBar").getComponent(cc.ProgressBar).progress = progress;
                    let timeProgress = "";
                    if(this.allTime == undefined){
                        this.allTime = 0;
                    }
                    timeProgress = this._startTime.toFixed(2)+"/"+this.allTime.toFixed(2)+"s";
                    glGame.editor.node.getChildByName("fishGroupProgress").getChildByName("progressBar").getChildByName("bar").getChildByName("lab_time").getComponent(cc.Label).string = timeProgress;
                }
                if(this.timeIndex > 0){
                    this.at = this.timeIndex;
                }
                this._runTimeALl += dt;
                if (this.timeIndex == -1) {//到尽头了，销毁
                    glGame.editor.status("运行时间："+this._runTimeALl.toFixed(2)+"  1 timeEndIndex "+this.at);
                    this.death(CONST.dieType0);
                    return
                }
                let t;
                let currTime;
                let nextTime;
                if(this.lastIndex == null || this.timeIndex != this.lastIndex){
                    currTime = this.getTimeByIndex(this.timeIndex);
                    nextTime = this.getTimeByIndex(this.timeIndex + 1);
                    this.currTime = currTime;
                    this.nextTime = nextTime;
                }else
                {
                    currTime = this.currTime;
                    nextTime = this.nextTime;
                }
                let fz = this._startTime - currTime;
                let fm = nextTime - currTime;
                t  = fz/fm;
                let i = this.timeIndex > 0 ?  3 * this.timeIndex : 2 * this.timeIndex;
                let a = this.posArray[i];
                let b = this.posArray[i + 1];
                let c = this.posArray[i + 2];
                if(!a){//拿不到数据，到尽头了，销毁
                    glGame.editor.status("运行时间："+this._runTimeALl.toFixed(2)+" 2 timeEndIndex "+this.at);
                    this.death(CONST.dieType0);
                    return
                }
                //轨迹运动
                let x = Math.pow(1 - t, 2) * a.x + 2 * t * (1 - t) * b.x + Math.pow(t, 2) * c.x;
                let y = Math.pow(1 - t, 2) * a.y + 2 * t * (1 - t) * b.y + Math.pow(t, 2) * c.y;
                //设置朝向
                this.node.angle = this.setAngle(x,y,this.node.position);
                this.node.x = x
                this.node.y = y
                this.lastIndex = this.timeIndex;
            } else if (this.fishPath.type == 1) {//多阶贝塞尔曲线运动,编辑器不支持多阶贝塞尔曲线路线图绘制，如需使用，无法显示准确的路径
                let t = this._startTime / this.fishLine.liveTime * 1000
                if (t >= 1) {
                    this.death(CONST.dieType0);
                    return
                }
                let pos = this.getPos(t)
                let x = pos.x
                let y = pos.y
                this.node.angle = this.setAngle(x,y,this.node.position);
                this.node.x = pos.x
                this.node.y = pos.y
            }
            if(this.delayedPause > 0){
                this.delayedPause = 0;
                this._bUpdate = false;
            }
        }
    },
    //循环体
    update(dt){
        //播放游的动画
        if(this.isPlayStartMc){
            this.playFishMovieClip(dt);
        }
        this.move(dt);
        //子弹碰撞 变色 恢复颜色
        if(this.isHit){
            this.hitTime -= dt;
            if(this.hitTime < 0){
                this.isHit = false;
                // if (this.fishData.resType == 0) {      //正常鱼
                    this.node.color = cc.color(255,255,255,255);
                // }else if (this.fishData.resType == 1) {//鱼群3
                //     for (let i =1;i<4;i++){
                //         let fish = this.node.getChildByName("ui_fish"+i);
                //         fish.color = cc.color(255,255,255,255);
                //     }
                // }else if (this.fishData.resType == 2) {//鱼群4
                //     for (let i =1;i<5;i++){
                //         let fish = this.node.getChildByName("ui_fish"+i);
                //         fish.color = cc.color(255,255,255,255);
                //     }
                // }else if (this.fishData.resType == 3) {//一网打尽
                //     for (let i =1;i<2;i++) {
                //         let fish = this.node.getChildByName("ui_fish"+i);
                //         fish.color = cc.color(255,255,255,255);
                //     }
                // }
            }
        }
    },
    //获取时间下标
    getIndexByTime(existTime) {
        let time = 0
        for (let i = 0; i < this.moveList.length / 2; i++) {
            let one = 2 * i;
            let two = 2 * i + 1;
            time = time + this.moveList[one] + this.moveList[two];
            if (time >= existTime) {
                return i;
            }
        }
        return -1
    },
    //通过下标获取时间
    getTimeByIndex(index) {
        let time = 0
        for (let i = 0; i < this.moveList.length / 2; i++) {
            if (i == index) {
                break
            }
            let one = 2 * i;
            let two = 2 * i + 1;
            time = time + this.moveList[one] + this.moveList[two]
        }
        return time
    },
    setAngle(x2,y2,point){
        let x1 = point.x;
        let y1 = point.y;
        this.setscale();
        return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    },
    setscale(){
        let  oneX = this.posArray[0].x;
        this.node.scaleY = oneX > 0 ? -this.editScale : this.editScale;
    },
    //获取贝塞尔点
    getPos(t) {
        let x = this.multilevelBezier(1, t, this.posArray.length - 1, 0)
        let y = this.multilevelBezier(2, t, this.posArray.length - 1, 0)
        return cc.v2(x,y);
    },
    //获取贝塞尔点
    multilevelBezier(type, t, k, i) {
        if (k == 0) {
            if (1 == type) {
                return this.posArray[i].x
            } else {
                return this.posArray[i].y
            }
        } else {
            return ((1 - t) * this.multilevelBezier(type, t, k - 1, i) + t * this.multilevelBezier(type, t, k - 1, i + 1))
        }
    },
    //获取基础数据
    getFishData(){
        return this.fishData;
    },
    OnDestroy() {
        this.moveList = [];
        // this.logic = null;
        this.fishData = null;
        this.fishLine = null;
        this.fishPath = null;
        this.index= 0;
        this.posArray = null;
        this.isHit    = false;
        this.hitTime  = 0;
    },
});