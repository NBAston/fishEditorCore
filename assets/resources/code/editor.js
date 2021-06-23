//捕鱼编辑器 主要是 资源、表、组、线 管理 业务逻辑
cc.Class({
    extends: cc.Component,
    properties: {
        tmpData:cc.JsonAsset,
    },
    onLoad () {
        if(window.ipcRenderer){
            let arr = [
                "btn_newGroup","btn_save","btn_out","btn_in","btn_importExcel","btn_inBg","btn_about",
                "btn_deleteLine","btn_showMc","btn_setting","btn_revoke","btn_redo",
                "btn_fishList","btn_resList","btn_lineList","btn_out2","btn_out3","btn_out4",
                "btn_showFishResEditView","file-opened-fishConfig","btn_restore"
            ]
            for (let i=0;i<arr.length;i++){
                window.ipcRenderer.on(arr[i],(event, data) =>{
                    this.click({currentTarget:{name:data}});
                });
            }
        }
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        glGame.currBezierID             = 0;    //当前id
        glGame.addPoint                 = false;//加贝塞尔点
        glGame.subPoint                 = false;//减贝塞尔点
        glGame.editor                   = this; //单例
        this.currAtl                    = null; //当前图集
        glGame.currentFish              = null; //当前鱼
        glGame.GFishList                = [];   //当前鱼组所有鱼
        this.clickFishTableTypeFishId   = null; //鱼表鼠标右键点击的鱼

        if(window.ipcRenderer){
            //存储当前的图集路径
            window.ipcRenderer.on("file-opened-atlasPath", (event, atlasPath) => {
                if(atlasPath){
                    cc.sys.localStorage.setItem("atlasPath",atlasPath);
                }
            });
            //存储当前的鱼表路径
            window.ipcRenderer.on("file-opened-fishTableExcelPath", (event, fishTableExcelPath) => {
                if(fishTableExcelPath){
                    cc.sys.localStorage.setItem("fishTableExcelPath",fishTableExcelPath);
                }
            });
            //导入鱼线
            window.ipcRenderer.on("file-opened-fishline", (event, file) => {
                if(file){
                    let tmpList = JSON.parse(file);
                    this.importJson(tmpList);//监听导入数据
                }
            });
            //导入 个性化导出面板
            window.ipcRenderer.on("file-opened-readOutSettingData", (event, jsonString) => {
                if(jsonString){
                    glGame.OutSettingData = JSON.parse(jsonString);
                    this.initOrReFreshOutSettingView();
                    glGame.editor.show("导入成功！");
                }
            });
            //导入 鱼表
            window.ipcRenderer.on("file-opened-fishexcel", (event, jsonString) => {
                if(jsonString){
                    glGame.fishTable = JSON.parse(jsonString);
                    console.log("glGame.fishTable : ",glGame.fishTable);
                    this.creatorFishForResView();
                }
            });
            //导入 背景
            window.ipcRenderer.on("file-opened-bg-data", (event, base64Image) => {
                console.warn("> 1 导入 背景  data ",base64Image);
                var img = new Image();
                img.src = base64Image;
                img.onload = function () {
                    var texture = new cc.Texture2D();
                    texture.initWithElement(img);
                    texture.handleLoadedTexture();
                    glGame.drawBezier.node.getChildByName("Testbg").getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(texture);
                    glGame.drawBezier.node.getChildByName("Testbg").active = true;
                };
            });
            //导入 背景
            window.ipcRenderer.on("file-opened-bg", (event, url) => {
                console.warn("> 2 导入 背景  url "+url)
                // cc.loader.load(url,  (error, frame) => {
                //     let spriteFrame = new cc.SpriteFrame();
                //     spriteFrame.setTexture(frame);
                //     glGame.drawBezier.node.getChildByName("Testbg").getComponent(cc.Sprite).spriteFrame = spriteFrame;
                //     glGame.drawBezier.node.getChildByName("Testbg").active = true;
                // });
                //
                // let url = "http://127.0.0.1:9591/fish1.png"
                console.warn("> 导入 背景  url "+url)
                cc.loader.load(url,  (error, frame) => {
                    let newFrame = new cc.SpriteFrame();
                    newFrame.setTexture(frame);
                    glGame.drawBezier.node.getChildByName("Testbg").getComponent(cc.Sprite).spriteFrame = newFrame;
                    glGame.drawBezier.node.getChildByName("Testbg").active = true;
                });
            });
        }
        //打开资源列表
        if(window.ipcRenderer){
            window.ipcRenderer.on("file-opened-fishRes", this.openedFishRes.bind(this));
        }else{
            cc.warn(">>>正在debug 模式 模拟打开鱼资源列表: （前置条件 本地http 服务器已打开：http://127.0.0.1:8456 ）")
            let tmparr = [];
            for (let i=1;i<32;i++){
                tmparr.push("fish"+i+".png");
            }
            let tmpData = {
                "fileList":tmparr,"fileServerUrl":"http://127.0.0.1:8456","code":0,"msg":"ok"};
            let str = JSON.stringify(tmpData);
            this.openedFishRes(null,str,()=>{
                glGame.fishTable = glGame.fishTableTest;
                console.log("glGame.fishTable : ",glGame.fishTable);
                this.creatorFishForResView();
            });
        }
        //鱼组搜索功能
        this.node.getChildByName("fishGroupCanteiner").getChildByName("searchGEditBox").on("text-changed",(editbox) => {
            glGame.SearchFList = {};
            if(editbox.string == ""){
                glGame.editor.status("请输入字符");
                glGame.editor.updateGroupToCanteinerAndFishLineToCanvas();
                return;
            }
            let groupLen = 0;
            let newD = glGame.FList;
            for (let groupID in newD){
                if(newD[groupID].desc.indexOf(editbox.string) != -1 && glGame.SearchFList[groupID] == undefined){
                    groupLen++
                    glGame.SearchFList[groupID] = newD[groupID];
                }
            }
            glGame.editor.status("鱼组搜索结果: 找到"+groupLen+"组");
            if(groupLen > 0){
                for (let group in glGame.SearchFList){
                    let list = glGame.SearchFList[group];
                    for (let fishID in list){
                        glGame.currLineItem = list[fishID];
                        glGame.editor.updateGroupToCanteinerAndFishLineToCanvas();
                        break;
                    }
                }
            }
        })
        //鱼线搜索功能
        this.node.getChildByName("fishLineCanteiner").getChildByName("searchLEditBox").on("text-changed",(editbox) => {
            glGame.searchList = {};
            if(editbox.string == ""){
                glGame.editor.status("请输入字符");
                glGame.editor.updateFishLineToCanvas();
                return;
            }
            let list;
            if(glGame.FList[glGame.currGIndex]){
                list = glGame.FList[glGame.currGIndex].fishLine;
            }
            let searchLen = 0;
            if(list){
                for (let key in list){
                    let line = list[key];
                    if(line.desc != null){
                        if(line.desc.indexOf(editbox.string) != -1 && glGame.searchList[line.lineID] == undefined){
                            glGame.searchList[line.lineID] = line;
                            searchLen++;
                        }
                    }
                }
            }
            glGame.editor.status("鱼线搜索结果: 找到"+searchLen+"条鱼线");
            glGame.editor.updateFishLineToCanvas();
        });
    },
    //获得一个Min-Max中间的随机数
    randomNum(Min,Max){
        let Range = Number(Max) - Number(Min);
        let Rand = Math.random();
        return (Min + Math.round(Rand * Range));
    },
    //选择鱼图资源文件夹，检查图集文件后
    openedFishRes(event,jsonstring,cb=null){
        glGame.editor.node.getChildByName("loadingView").getChildByName("lab").getComponent(cc.Label).string = "正在导入资源...请稍等";
        glGame.editor.node.getChildByName("loadingView").active = true;
        let data = JSON.parse(jsonstring);
        if(data.code != 0){
            glGame.editor.alert(data.msg);
            return;
        }
        glGame.resFileList = data.fileList;
        glGame.fileServerUrl = data.fileServerUrl;
        glGame.getAtlasAll = [];
        console.warn(">>文件服务器设置完成 URL: ",glGame.fileServerUrl);
        console.warn("tmpList:");
        console.warn(glGame.resFileList);
        glGame.editor.status("正在准备导入图集...");
        if(glGame.resFileList){
            let len = glGame.resFileList.length;
            let length = 0;
            for (let i=0;i<len;i++) {
                let fileName = glGame.resFileList[i].split(".")[0];
                glGame.getAtlasAll.push(fileName);
                glGame.loadingAtlas(fileName,glGame.fileServerUrl,()=>{
                    length++;
                    if(length == len){
                        glGame.editor.status("导入结束！ 成功导入："+length+"个图集");
                        glGame.editor.node.getChildByName("loadingView").active = false;
                        glGame.editor.node.getChildByName("fishTableImport").active = true;
                        if(cb){
                            cb();
                        }
                    }
                });
            }
        }
    },
    //获取资源id
    getFishResConfig(fishTypeId){
        if(!glGame.fishTable){//使用本地的
            glGame.editor.alert("请导入鱼图表Excel后再继续！")
            return;
        }
        return glGame.fishTable[Number(fishTypeId)];
    },
    onKeyDown: function (event) {
        switch(event.keyCode) {
            case cc.macro.KEY.f12:
                if(window.ipcRenderer)window.ipcRenderer.send("keyf12");
                break;
            case cc.macro.KEY.f10:
                if(window.ipcRenderer)window.ipcRenderer.send("outjson",JSON.stringify(glGame.FList));
                break;
            default :
            if(window.ipcRenderer)window.ipcRenderer.send("key_"+event.keyCode);
        }
        switch(event.keyCode) {
            case cc.macro.KEY.ctrl:
                glGame.Ctrl = true;
                cc.game.canvas.style.cursor = "all-scroll";
                glGame.editor.status("这个时候可以拖动");
                cc.error(">>>> 1 length "+glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].posArray.length)
                break;
            case cc.macro.KEY.z://往后 恢复历史
                if(glGame.Ctrl){
                    this.btn_revoke();
                }
                break;
            case cc.macro.KEY.y://恢复 上一次 Ctrl + z 的内容
                if(glGame.Ctrl) {
                    this.btn_redo();
                }
                break;
            case cc.macro.KEY.s:
                if(glGame.Ctrl){
                    glGame.drawBezier.saveDataToFishPointList()//保存数据 到 FishPointList
                }
                break;
            case cc.macro.KEY.f1:
                glGame.isCreator = true;
                this.showCreatorFishGroupView();
                break;
            case cc.macro.KEY.f2:
                this.node.getChildByName("creatorFish").active = !this.node.getChildByName("creatorFish").active;
                break;
            case cc.macro.KEY.f3:
                break;
            case cc.macro.KEY.f5:
                this.node.getChildByName("settingView").active = !this.node.getChildByName("settingView").active;
                break;
            case cc.macro.KEY.f6:
                if(glGame.isShowBg == null)glGame.isShowBg = false;
                glGame.isShowBg = !glGame.isShowBg;
                glGame.drawBezier.node.getChildByName("Testbg").active = glGame.isShowBg;
                break;
            case cc.macro.KEY.f8:
                glGame.drawBezier.node.active = !glGame.drawBezier.node.active;
                break;
            case cc.macro.KEY.escape:
                if(this.node.getChildByName("settingView").active){
                    this.node.getChildByName("settingView").active = false;
                }else if(this.node.getChildByName("fishGoulpInfomation").active){
                    this.node.getChildByName("fishGoulpInfomation").active = false;
                }else if(this.node.getChildByName("creatorFish").active){
                    this.node.getChildByName("creatorFish").active = false;
                }else if(this.node.getChildByName("chooseFishingLine").active){
                    this.node.getChildByName("chooseFishingLine").active = false;
                }else if(this.node.getChildByName("fishGroupMenu").active){
                    this.node.getChildByName("fishGroupMenu").active = false;
                    glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = false;
                }
                break;
            case cc.macro.KEY.space:
                this.runGroupFish(false);
                break;
            case cc.macro.KEY.f9:
                glGame.drawBezier.saveDataToFishPointList()//保存数据 到 FishPointList
                break;
            case cc.macro.KEY.h://隐藏鱼
                if(glGame.Ctrl){
                    this.hideOrShowFish(false);
                }
                break;
            case cc.macro.KEY.g://显示鱼
                if(glGame.Ctrl){
                    this.hideOrShowFish(true);
                }
                break;
            case cc.macro.KEY.a://导入测试数据
                if(!window.ipcRenderer){//debug 模式
                    cc.warn(">>> 导入测试数据 ....",this.tmpData.json)
                    this.importJson(this.tmpData.json)
                }
                break;
            case cc.macro.KEY.q://导出测试数据
                //this.click({currentTarget:{name:"btn_out"}});
                if(!window.ipcRenderer){//debug 模式
                    cc.log("out....");
                    this.click({currentTarget:{name:"btn_out"}});
                }
                break;
        }
    },
    onKeyUp: function (event) {
        switch(event.keyCode) {
            case cc.macro.KEY.ctrl:
                glGame.Ctrl = false;
                cc.game.canvas.style.cursor = "auto";
                glGame.editor.status("");
                break;
        }
    },
    start(){
        glGame.editor.status("TIPS: 请导入 鱼资源表 ，资源界面鼠标右键 新建鱼 开始",glGame.Color.RED);
        if(glGame.currGIndex == 0){
            glGame.currGIndex = glGame.startGroupIndex;
        }
        this.node.getChildByName("bg").on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            if(glGame.editor.node.getChildByName("fishGroupMenu").active){
                glGame.editor.node.getChildByName("fishGroupMenu").active = false;
                glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = false;
            }
            if(glGame.editor.node.getChildByName("chooseFishingLine").active){
                glGame.editor.node.getChildByName("chooseFishingLine").active = false;
            }
            if(event.target.name.indexOf("menu") != -1){
                return;
            }
            if(!glGame.atlasList){
                glGame.editor.alert("找不到图集，请选择图集目录！",(a)=>{
                    if(a){
                        if(window.ipcRenderer)window.ipcRenderer.send("sFishPth");
                    }
                });
                return;
            }

            if(!glGame.fishTable){
                glGame.editor.alert("找不到鱼表，请导入！",(a)=>{
                    if(a){
                        this.click({currentTarget:{name:"btn_importExcel"}});
                    }
                });
                return;
            }
            if(!glGame.FList[glGame.currGIndex]){   //提示创建鱼组
                glGame.editor.alert("请创建鱼组~",(a)=>{
                    if(a){
                        glGame.isCreator = true;
                        this.showCreatorFishGroupView();
                    }
                });
                return;
            }
            // 鼠标右键
            if(!glGame.currentFish){
                glGame.editor.status("请创建一条鱼");
            }
        });
        //鱼表
        let fishCanteinerContent = this.node.getChildByName("fishCanteiner").getChildByName("fishScrollView").getChildByName("view").getChildByName("content");
        fishCanteinerContent.on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            // 鱼表 鼠标右键
            if (event.getButton() == cc.Event.EventMouse.BUTTON_RIGHT) {
                if(event.target.name.indexOf("resList_fish_") != -1 ){
                    this.clickFishTableTypeFishId = Number(event.target.fishTypeId);
                }
                if(!glGame.FList[glGame.currGIndex]){   //提示创建鱼组
                    glGame.editor.alert("请创建鱼组",(a)=>{
                        if(a){
                            glGame.isCreator = true;
                            this.showCreatorFishGroupView();
                        }
                    });
                    return;
                }
                if(this.clickFishTableTypeFishId){
                    this.showCreatFishView(true);
                }else{
                    glGame.editor.status("没点中鱼！请重试！");
                }
            }
        });
        let chooseFishingLine = glGame.editor.node.getChildByName("chooseFishingLine");
        glGame.editor.node.getChildByName("fishGroupMenu").active = false;
        glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = false;
        glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").opacity = 255;
        chooseFishingLine.active = false;
        chooseFishingLine.getChildByName("bg").opacity = 255;
        glGame.editor.node.getChildByName("alertView").active = false;
        glGame.editor.node.getChildByName("alertView").opacity = 200;
        let fishLineCanteinerContent = this.node.getChildByName("fishLineCanteiner").getChildByName("fishLineScrollView").getChildByName("view").getChildByName("content");
        let fishGroupCanteiner = this.node.getChildByName("fishGroupCanteiner").getChildByName("fishGroupScrollView").getChildByName("view").getChildByName("content");
        //鱼线 列表 右键 监听
        fishLineCanteinerContent.on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            if(chooseFishingLine.active){
                chooseFishingLine.active = false;
            }
            //右键监听
            if (event.getButton() == cc.Event.EventMouse.BUTTON_RIGHT) {
                if(event.target.name.indexOf("_") != -1){
                    glGame.editor.chooseFishID = event.target.lineID;
                    glGame.editor.status("当前选中鱼线ID："+glGame.editor.chooseFishID);
                    chooseFishingLine.active = true;
                    let pos  = chooseFishingLine.convertToNodeSpaceAR(event.getLocation());
                    let bg = chooseFishingLine.getChildByName("bg");
                    let height = bg.height
                    let x = pos.x-bg.width/2;
                    let y = pos.y-height/2;
                    bg.setPosition(x,y);
                    if(bg.y < 0 && bg.y < -658){
                        bg.y = -658;
                    }
                    if(bg.y > 0 && bg.y > 665){
                        bg.y = 658;
                    }
                }else{
                    glGame.editor.status("点×了，请瞄准Item点击");
                }
            }
            //左键监听
            if (event.getButton() == cc.Event.EventMouse.BUTTON_LEFT){
                if(event.target.name.indexOf("_") != -1){
                    if(glGame.lastItemNode != null && glGame.lastItemNode.children != null && glGame.lastItemNode.getChildByName("heightLine")){
                        glGame.lastItemNode.getChildByName("heightLine").active = false;
                    }
                    glGame.editor.node.getChildByName("editBar").getChildByName("btn_pay").active = true;
                    glGame.editor.node.getChildByName("editBar").getChildByName("btn_push").active = false;
                    glGame.lastItemNode = event.target;
                    glGame.lastItemNode.getChildByName("heightLine").active = true;
                    for (let i=0;i<glGame.GFishList.length;i++){
                        if(glGame.GFishList[i].lineID == event.target.lineID){
                            if(glGame.currentFish){
                                glGame.currentFish.getComponent("fish_Unit").settingIcing(false);
                                glGame.currentFish.setPosition(glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].posArray[0]);
                            }
                            glGame.currentFish = glGame.GFishList[i];
                            break;
                        }
                    }
                    glGame.editor.status("当前选中鱼线ID  currentFish ："+event.target.lineID);
                    glGame.currLineItem = glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID];
                    glGame.editor.getFishToCanvas(glGame.currentFish.lineID);
                }
            }
        });
        //鱼组 列表 鱼组右键 和 鱼组左键 监听
        fishGroupCanteiner.on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            if(glGame.editor.node.getChildByName("fishGroupMenu").active){
                glGame.editor.node.getChildByName("fishGroupMenu").active = false;
                glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = false;
            }
            //右键监听
            if (event.getButton() == cc.Event.EventMouse.BUTTON_RIGHT) {
                if(event.target.name.indexOf("_") != -1){
                    let bg = glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg")
                    glGame.tmpGroupId = Number(event.target.name.split("_")[1]);
                    cc.warn("> 鱼组 列表 右键 > ",glGame.tmpGroupId)
                    glGame.editor.node.getChildByName("fishGroupMenu").active = true;
                    glGame.editor.node.getChildByName("leftClickMenu").active = false;
                    bg.getChildByName("btn_Paste").active = glGame.copyToGroup != null;
                    bg.getChildByName("btn_PasteLine").active = glGame.copyLineFIshID != null;
                    bg.getChildByName("btn_PasteOptionLine").active = glGame.optionCopyLinePasterOtherGroup_groupID != null;
                    if(bg.getChildByName("btn_Paste").active || bg.getChildByName("btn_PasteLine").active || bg.getChildByName("btn_PasteOptionLine").active){
                        bg.Oldheight = bg.height;
                        bg.height = 288;
                    }else{
                       if(bg.Oldheight) bg.height = bg.Oldheight;
                    }
                    let pos  = glGame.editor.node.getChildByName("fishGroupMenu").convertToNodeSpaceAR(event.getLocation());
                    let height = bg.height/2;
                    let x = pos.x+bg.width/2;
                    let y = pos.y-height;
                    bg.setPosition(x,y);
                }
            }
            //左键监听
            if (event.getButton() == cc.Event.EventMouse.BUTTON_LEFT){//应用鱼组
                if(event.target.name.indexOf("_") != -1){
                    let cgi = Number(event.target.name.split("_")[1]);
                    let len = 0;
                    let firstKey = null;
                    for(let key in glGame.FList[cgi]){
                        len++;
                        if(!firstKey){
                            firstKey = key;
                        }
                    }

                    if(glGame.currentFish){
                        glGame.currentFish.getComponent("fish_Unit").dispose();
                    }

                    glGame.editor.node.getChildByName("editBar").getChildByName("btn_pay").active = true;
                    glGame.editor.node.getChildByName("editBar").getChildByName("btn_push").active = false;

                    glGame.drawBezier.clearCurrFishLine();
                    glGame.currentFish = null;

                    if(glGame.currGItem != null && glGame.currGItem.children != null && glGame.currGItem.childrenCount > 0)glGame.currGItem.getChildByName("heightLine").active = false;
                    glGame.currGItem = event.target;
                    glGame.currGItem.getChildByName("heightLine").active = true;
                    glGame.currGIndex = cgi;
                    glGame.addNewLineId = null;
                    let ish = false;
                    if(len == 0){
                        glGame.editor.status("鱼组"+cgi+"无数据");
                    }else{
                        let list =  glGame.FList[cgi];
                        for(let key in list.fishLine){
                            if(list.fishLine[key]){
                                //应用鱼线
                                ish = true;
                                glGame.currLineItem = list.fishLine[key];
                                glGame.editor.updateFishLineToCanvas();
                                break;
                            }
                        }
                    }
                }
            }
        });
        glGame.drawBezier.initDataToFishPointList();
        this.node.getChildByName("fishGroupProgress").active = false;
        this.node.getChildByName("fishGroupProgress").getChildByName("slider").on('slide', this.onSlide, this);
        this.node.getChildByName("fishGroupProgress").isGroupPlay = false;

        this.node.on(cc.Node.EventType.MOUSE_WHEEL, (event) => {
            let deskUI = glGame.editor.node.getChildByName("deskUI");
            if(event._scrollY>0){
                if(deskUI.scale < 3){
                    deskUI.scale += 0.05;
                }
            }else {
                if(deskUI.scale > 0.1){
                    deskUI.scale -= 0.05;
                }
            }
        }, this);
    },
    onSlide(e){
        this.node.getChildByName("fishGroupProgress").getChildByName("progressBar").getComponent(cc.ProgressBar).progress = e.progress;
        this.node.getChildByName("fishGroupProgress").getChildByName("btn_startPlay").active = e.progress == 0 || e.progress == 1 ? false : true;
        this.node.getChildByName("fishGroupProgress").getChildByName("btn_pushGroup").active = !this.node.getChildByName("fishGroupProgress").getChildByName("btn_startPlay").active;
        if(e.progress == 1){
            this.node.getChildByName("fishGroupProgress").getChildByName("btn_pushGroup").active = false;
            this.node.getChildByName("fishGroupProgress").getChildByName("btn_startPlay").active = !this.node.getChildByName("fishGroupProgress").getChildByName("btn_pushGroup").active;
        }
        if(this.node.getChildByName("fishGroupProgress").isGroupPlay){
            if(glGame.GFishList && glGame.GFishList.length > 0){
                let len = glGame.GFishList.length;
                for (let i = 0;i<len;i++){
                    let f = glGame.GFishList[i];
                    if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").updateData();
                    if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").setProgress(e.progress);
                }
            }
        }else{
            let f = glGame.currentFish;
            if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").updateData();
            if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").setProgress(e.progress);
        }
    },
    //判断范围
    isEnterArea(pos,nodeName){
        let x = this.node.getChildByName(nodeName).x - this.node.getChildByName(nodeName).width/2;
        let y = this.node.getChildByName(nodeName).y - this.node.getChildByName(nodeName).height/2;
        let pos1 = cc.v2(x,y);
        let x2 = this.node.getChildByName(nodeName).x + this.node.getChildByName(nodeName).width/2;
        let y2 = this.node.getChildByName(nodeName).y + this.node.getChildByName(nodeName).height/2;
        let pos2 = cc.v2(x2,y2);

        if(pos.x > pos1.x && pos.x < pos2.x){
            return true;
        }
        if(pos.y < pos1.y && pos.y > pos2.y){
            return true;
        }
        return false;
    },
    //鱼组继续运行
    runGroupFish(isR){
        if(isR){
            this.node.getChildByName("fishGroupProgress").getChildByName("btn_pushGroup").active = true;
            this.node.getChildByName("fishGroupProgress").getChildByName("btn_startPlay").active = !this.node.getChildByName("fishGroupProgress").getChildByName("btn_pushGroup").active;
            if(this.node.getChildByName("fishGroupProgress").isGroupPlay){
                if(glGame.GFishList && glGame.GFishList.length > 0){
                    let len = glGame.GFishList.length;
                    for (let i = 0;i<len;i++){
                        let f = glGame.GFishList[i];
                        if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").updateData();
                        if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").settingIcing(true);
                    }
                }
            }else{
                let f = glGame.currentFish;
                if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").updateData();
                if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").settingIcing(true);
            }
        }else{
            this.node.getChildByName("fishGroupProgress").getChildByName("btn_pushGroup").active = false;
            this.node.getChildByName("fishGroupProgress").getChildByName("btn_startPlay").active = !this.node.getChildByName("fishGroupProgress").getChildByName("btn_pushGroup").active;
            if(this.node.getChildByName("fishGroupProgress").isGroupPlay){
                if(glGame.GFishList && glGame.GFishList.length > 0){
                    let len = glGame.GFishList.length;
                    for (let i = 0;i<len;i++){
                        let f = glGame.GFishList[i];
                        if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").updateData();
                        if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").settingIcing(false);
                    }
                }
            }else{
                let f = glGame.currentFish;
                if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").updateData();
                if(f && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").settingIcing(false);
            }
        }
    },
    //click事件
    click(evt){
        if(evt.currentTarget.name == "menu1Button"){//右键菜单1 - 快速添加
            glGame.paintingArea.emit("addNewPoint",glGame.currDownEvent);
            glGame.editor.node.getChildByName("leftClickMenu").active = false;
        }
        if(evt.currentTarget.name == "menu2Button"){//右键菜单2 - 手动输入
            glGame.editor.node.getChildByName("leftClickMenu").active = false;

            let newPoint2 = glGame.editor.node.getChildByName("newPoint2");
            newPoint2.active = true;
            newPoint2.getChildByName("lab_bzier1X").getChildByName("editbox").getComponent(cc.EditBox).string = "";
            newPoint2.getChildByName("lab_bzier1Y").getChildByName("editbox").getComponent(cc.EditBox).string = "";

            newPoint2.getChildByName("lab_bzier2X").getChildByName("editbox").getComponent(cc.EditBox).string = "";
            newPoint2.getChildByName("lab_bzier2Y").getChildByName("editbox").getComponent(cc.EditBox).string = "";

        }
        if(evt.currentTarget.name == "menu3Button"){//右键菜单3 - 播放整组
            glGame.editor.node.getChildByName("leftClickMenu").active = false;
        }
        if(evt.currentTarget.name == "menu4Button"){//右键菜单4 - 播放该线
            glGame.editor.node.getChildByName("leftClickMenu").active = false;
        }
        if(evt.currentTarget.name == "menu5Button"){//右键菜单5 - 刷新
            glGame.editor.node.getChildByName("leftClickMenu").active = false;
        }
        if(evt.currentTarget.name == "menu6Button"){//右键菜单6 - 隐藏/显示 鱼
            glGame.editor.node.getChildByName("leftClickMenu").active = false;
            this.hideOrShowFish2();
        }
        if(evt.currentTarget.name == "btn_startPlay"){//继续播放 ,解冻
            this.runGroupFish(true);
        }
        if(evt.currentTarget.name == "btn_revoke"){//撤销
            console.warn(" 撤销 ")
            this.btn_revoke();
        }
        if(evt.currentTarget.name == "btn_redo"){//重做
            console.warn(" 重做 ")
            this.btn_redo();
        }
        if(evt.currentTarget.name == "closeNrePoint2"){//关闭新增鱼线点界面
            let newPoint2 = glGame.editor.node.getChildByName("newPoint2");
            newPoint2.active = false;
            glGame.editor.node.getChildByName("leftClickMenu").active = false;
        }
        if(evt.currentTarget.name == "newPointOkButton2"){//确定 新增
            let newPoint2 = glGame.editor.node.getChildByName("newPoint2");
            newPoint2.active = false;
            let str1X = Number(newPoint2.getChildByName("lab_bzier1X").getChildByName("editbox").getComponent(cc.EditBox).string);
            let str1Y = Number(newPoint2.getChildByName("lab_bzier1Y").getChildByName("editbox").getComponent(cc.EditBox).string);

            let str2X = Number(newPoint2.getChildByName("lab_bzier2X").getChildByName("editbox").getComponent(cc.EditBox).string);
            let str2Y = Number(newPoint2.getChildByName("lab_bzier2Y").getChildByName("editbox").getComponent(cc.EditBox).string);
            glGame.currDownEvent.bzierData = {controlPos:cc.v2(str1X,str1Y),endPos:cc.v2(str2X,str2Y)};
            glGame.paintingArea.emit("addNewPoint", glGame.currDownEvent);
        }
        if(evt.currentTarget.name == "btn_pushGroup"){//暂停播放 ,冻
            this.runGroupFish(false);
        }
        if(evt.currentTarget.name == "chooseFishingLine"){//点击鱼线列表右键弹出的 选择界面
            glGame.editor.node.getChildByName("leftClickMenu").active = false;
            let pos  = glGame.editor.node.getChildByName("chooseFishingLine").convertToNodeSpaceAR(evt.getLocation());
            if(!this.isEnterArea(pos,"fishLineCanteiner")){
                this.node.getChildByName("chooseFishingLine").active = !this.node.getChildByName("chooseFishingLine").active;
            }
        }
        if(evt.currentTarget.name == "fishGroupMenu"){//点击鱼组列表右键弹出的 选择界面
            let pos  = glGame.editor.node.getChildByName("fishGroupMenu").convertToNodeSpaceAR(evt.getLocation());
            if(!this.isEnterArea(pos,"fishGroupCanteiner")){
                this.node.getChildByName("fishGroupMenu").active = !this.node.getChildByName("fishGroupMenu").active;
                glGame.editor.node.getChildByName("leftClickMenu").active = false;
            }
        }
        if(evt.currentTarget.name == "btn_editLineInfo"){//鱼线列表 右键 弹出窗 - 编辑线路信息
            glGame.editor.node.getChildByName("leftClickMenu").active = false;
            let chooseFishingLine = glGame.editor.node.getChildByName("chooseFishingLine");
            chooseFishingLine.active = !chooseFishingLine.active;
            glGame.isCreat = false;
            this.showCreatFishView(false);
        }
        if(evt.currentTarget.name == "chooseFishingLineMask") {//鱼线列表 遮罩
            let chooseFishingLine = glGame.editor.node.getChildByName("chooseFishingLine");
            chooseFishingLine.active = !chooseFishingLine.active;
        }
        if(evt.currentTarget.name == "closeFishList"){
            this.node.getChildByName("fishCanteiner").active = false;
        }
        if(evt.currentTarget.name == "btn_fishGroupProgress"){
            this.node.getChildByName("fishGroupProgress").active = false;
            this.node.getChildByName("fishGroupProgress").isGroupPlay = true;
        }
        if(evt.currentTarget.name == "btn_pay" || evt.currentTarget.name == "menu4Button"){//右键菜单4 - 播放该线
            this.node.getChildByName("fishGroupProgress").isGroupPlay = false;
            this.node.getChildByName("fishGroupProgress").active = true;
            glGame.editor.node.getChildByName("editBar").getChildByName("btn_pay").active = false;
            glGame.editor.node.getChildByName("editBar").getChildByName("btn_push").active = true;
            if(glGame.currentFish){
                if(glGame.currentFish.getComponent("fish_Unit")){
                    glGame.currentFish.getComponent("fish_Unit").settingIcing(true);
                }
            }
            if(glGame.pearssPush != undefined)return;//暂停了
            if(glGame.currentFish != undefined){
                glGame.drawBezier.playBezierFishLine();
            }else{
                glGame.editor.status("请先创建一条鱼");
            }
        }
        if(evt.currentTarget.name == "btn_refush" || evt.currentTarget.name == "menu5Button"){//刷新 右键菜单5 - 刷新
            glGame.editor.node.getChildByName("editBar").getChildByName("btn_push").active = false;
            glGame.editor.node.getChildByName("editBar").getChildByName("btn_pay").active = !glGame.editor.node.getChildByName("editBar").getChildByName("btn_push").active;
            let list = glGame.FList[glGame.currGIndex].fishLine;
            if(list){
                for (let fishID in list){
                    glGame.currLineItem = list[fishID];
                    glGame.editor.updateGroupToCanteinerAndFishLineToCanvas();
                    break;
                }
            }
        }
        if(evt.currentTarget.name == "btn_push"){
            glGame.pearssPush = "ok";
            glGame.editor.node.getChildByName("editBar").getChildByName("btn_push").active = !glGame.editor.node.getChildByName("editBar").getChildByName("btn_push").active;
            glGame.editor.node.getChildByName("editBar").getChildByName("btn_pay").active = !glGame.editor.node.getChildByName("editBar").getChildByName("btn_push").active;
            glGame.currentFish.getComponent("fish_Unit").settingIcing(false);
        }
        if(evt.currentTarget.name == "btn_restore"){//打开上次
            if(window.ipcRenderer){
                let atlasPath           = cc.sys.localStorage.getItem("atlasPath");//图集路径
                let fishTableExcelPath  = cc.sys.localStorage.getItem("fishTableExcelPath");//鱼表路径
                cc.warn("  打开上次  atlasPath ",atlasPath," fishTableExcelPath ",fishTableExcelPath);
                if(atlasPath != null && atlasPath != ""){
                    if(fishTableExcelPath != null && fishTableExcelPath != ""){
                        let data        = {atlasPath:atlasPath,fishTableExcelPath:fishTableExcelPath}
                        window.ipcRenderer.send("open-restore",JSON.stringify(data));
                    }
                }else{
                    if(atlasPath == null || atlasPath == ""){
                        glGame.editor.alert("无记录");
                    }
                }
            }
        }
        if(evt.currentTarget.name == "btn_fishList"){//鱼组列表 - 鱼组
            this.clickMenu("view_menu3",evt.currentTarget.name);
            this.node.getChildByName("fishGroupCanteiner").active = !this.node.getChildByName("fishGroupCanteiner").active;
        }
        if(evt.currentTarget.name == "btn_resList"){//资源列表 - 鱼
            this.clickMenu("view_menu3",evt.currentTarget.name);
            this.node.getChildByName("fishCanteiner").active = !this.node.getChildByName("fishCanteiner").active;
        }
        if(evt.currentTarget.name == "GroupItem"){//当前 鱼组信息界面
            this.node.getChildByName("fishGoulpInfomation").active = !this.node.getChildByName("fishGoulpInfomation").active;
        }
        if(evt.currentTarget.name == "btn_lineList"){// 鱼线列表
            this.clickMenu("view_menu3",evt.currentTarget.name);
            this.node.getChildByName("fishLineCanteiner").active = !this.node.getChildByName("fishLineCanteiner").active;
        }
        if(evt.currentTarget.name == "closeFishLineGroup"){// 鱼线列表
            this.node.getChildByName("fishLineCanteiner").active = !this.node.getChildByName("fishLineCanteiner").active;
        }
        if(evt.currentTarget.name == "searhGroupButton"){//鱼组 搜索
            let searchGEditBox = this.node.getChildByName("fishGroupCanteiner").getChildByName("searchGEditBox");
            searchGEditBox.active = !searchGEditBox.active;
            let sl = 0;
            if(!searchGEditBox.active){
                if(glGame.SearchFList != undefined){
                    for (let k in glGame.SearchFList){
                        sl++;
                        break;
                    }
                }
                if(sl > 0){
                    glGame.SearchFList = null;
                    glGame.editor.updateGroupToCanteinerAndFishLineToCanvas();
                }
            }
        }
        if(evt.currentTarget.name == "searhLineButton"){//鱼线 搜索
            let searhLineButton = this.node.getChildByName("fishLineCanteiner").getChildByName("searchLEditBox");
            searhLineButton.active = !searhLineButton.active;
            if(!searhLineButton.active){
                if(glGame.searchList != undefined && glGame.searchList.length >0){
                    glGame.searchList = [];
                    glGame.editor.updateFishLineToCanvas();
                }
            }
        }
        if(evt.currentTarget.name == "closeGroupInfo"){//关闭 - 关闭鱼组信息界面
            this.node.getChildByName("fishGoulpInfomation").active = !this.node.getChildByName("fishGoulpInfomation").active;
        }
        if(evt.currentTarget.name == "btn_fishLineSubmit"){//提交 - 关闭鱼线信息界面
            this.node.getChildByName("fishGoulpInfomation").active = !this.node.getChildByName("fishGoulpInfomation").active;
        }
        if(evt.currentTarget.name == "menu1"){
            this.node.getChildByName("view_menu1").active = !this.node.getChildByName("view_menu1").active;
            this.node.getChildByName("view_menu2").active = false;
            this.node.getChildByName("view_menu3").active = false;
            return;
        }
        if(evt.currentTarget.name == "menu2"){
            this.node.getChildByName("view_menu2").active = !this.node.getChildByName("view_menu2").active;
            this.node.getChildByName("view_menu1").active = false;
            this.node.getChildByName("view_menu3").active = false;
            return;
        }
        if(evt.currentTarget.name == "menu3"){
            this.node.getChildByName("view_menu3").active = !this.node.getChildByName("view_menu3").active;
            this.node.getChildByName("view_menu1").active = false;
            this.node.getChildByName("view_menu2").active = false;
            return;
        }
        if(evt.currentTarget.name == "btn_new"){//新建项目
            this.clickMenu("view_menu1",evt.currentTarget.name);
        }
        if(evt.currentTarget.name == "btn_save"){//保存
            this.clickMenu("view_menu1",evt.currentTarget.name);
            glGame.drawBezier.saveDataToFishPointList();
        }
        if(evt.currentTarget.name == "logo"){//点击logo
            this.openAbout();
        }
        if(evt.currentTarget.name == "btn_inBg"){//导入背景
            this.clickMenu("view_menu1",evt.currentTarget.name);

        }
        if(evt.currentTarget.name == "btn_about"){//关于
            this.clickMenu("view_menu1",evt.currentTarget.name);
            this.openAbout();
        }
        if(evt.currentTarget.name == "close _about_bg"){//关于-背景-关闭
            this.closeAbout();
        }
        if(evt.currentTarget.name == "btn_InfoEditor"){//信息查看
            glGame.editor.node.getChildByName("fishGroupMenu").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = false;
            glGame.isCreator = false;
            this.showCreatorFishGroupView();
        }
        if(evt.currentTarget.name == "btn_newGroup"){//新建鱼组
            this.node.getChildByName("view_menu1").active = !this.node.getChildByName("view_menu1").active;
            glGame.isCreator = true;
            this.showCreatorFishGroupView();
        }
        if(evt.currentTarget.name == "btn_setting"){//打开项目设置面板
            this.clickMenu("view_menu2",evt.currentTarget.name);
            this.node.getChildByName("settingView").active = true;
        }
        if(evt.currentTarget.name == "btn_fishGroupSubmit"){//提交 -  鱼组信息界面
            this.creatFishGroupSubmit();
        }
        if(evt.currentTarget.name == "btn_copyLineOption"){//拷贝鱼线 选项
            let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
            optionCopyLine.active = !optionCopyLine.active;
        }
        if(evt.currentTarget.name == "btn_copyGroupOption"){//选项拷贝鱼组
            glGame.optionCopyLinePasterOtherGroup_groupID = null;
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = true;
        }
        if(evt.currentTarget.name == "fishGroupMenuMask"){//鱼组菜单 遮罩
            glGame.editor.node.getChildByName("fishGroupMenu").active = false;
        }
        if(evt.currentTarget.name == "btn_closebatchOperationFishLine") {//关闭 批量操作
            let batchOperationFishLine = glGame.editor.node.getChildByName("batchOperationFishLine");
            batchOperationFishLine.active = false;
        }
        if(evt.currentTarget.name == "btn_batchOperation"){//批量操作
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").active = false;
            let batchOperationFishLine = glGame.editor.node.getChildByName("batchOperationFishLine");
            let layout = batchOperationFishLine.getChildByName("layout")
            batchOperationFishLine.active = true;
            layout.getChildByName("lab_group").getComponent(cc.Label).string = glGame.tmpGroupId+"";
        }
        if(evt.currentTarget.name == "btn_batchOpOk"){//批量操作 ok
            let batchOperationFishLine = glGame.editor.node.getChildByName("batchOperationFishLine");
            let layout   = batchOperationFishLine.getChildByName("layout");
            let resGroupId   = layout.getChildByName("lab_resGroupId").getChildByName("editbox").getComponent(cc.EditBox).string;
            let showTime = layout.getChildByName("lab_showTime").getChildByName("editbox").getComponent(cc.EditBox).string;
            let rate     = layout.getChildByName("lab_rate").getChildByName("editbox").getComponent(cc.EditBox).string;
            let frequency= layout.getChildByName("lab_frequency").getChildByName("editbox").getComponent(cc.EditBox).string;
            let scale     = layout.getChildByName("lab_scale").getChildByName("editbox").getComponent(cc.EditBox).string;
            let startPX  = layout.getChildByName("lab_startP_x").getChildByName("editbox").getComponent(cc.EditBox).string;
            let startPY  = layout.getChildByName("lab_startP_y").getChildByName("editbox").getComponent(cc.EditBox).string;
            let endPX    = layout.getChildByName("lab_endP_x").getChildByName("editbox").getComponent(cc.EditBox).string;
            let endPY    = layout.getChildByName("lab_endP_y").getChildByName("editbox").getComponent(cc.EditBox).string;
            let multiplication_startPX  = layout.getChildByName("lab_multiplication_startP_x").getChildByName("editbox").getComponent(cc.EditBox).string;
            let multiplication_startPY  = layout.getChildByName("lab_multiplication_startP_y").getChildByName("editbox").getComponent(cc.EditBox).string;
            let multiplication_endPX    = layout.getChildByName("lab_multiplication_endP_x").getChildByName("editbox").getComponent(cc.EditBox).string;
            let multiplication_endPY    = layout.getChildByName("lab_multiplication_endP_y").getChildByName("editbox").getComponent(cc.EditBox).string;
            for(let lineID in glGame.FList[Number(glGame.tmpGroupId)].fishLine){
                if(resGroupId != ""){
                    glGame.FList[Number(glGame.tmpGroupId)].fishLine[lineID].resGroupId = Number(resGroupId);
                }
                if(scale != ""){
                    glGame.FList[Number(glGame.tmpGroupId)].fishLine[lineID].scale = Number(scale);
                }
                if(showTime != ""){
                    glGame.FList[Number(glGame.tmpGroupId)].fishLine[lineID].showTime += Number(showTime);
                }
                if(frequency != ""){
                    glGame.FList[Number(glGame.tmpGroupId)].fishLine[lineID].frequency = Number(frequency);
                }
                if(rate != ""){
                    glGame.FList[Number(glGame.tmpGroupId)].fishLine[lineID].rate = Number(rate);
                    let moveList = glGame.FList[Number(glGame.tmpGroupId)].fishLine[lineID].moveList;
                    let len = moveList.length;
                    for (let i =0;i<len;i++){
                        moveList[i] = Number(rate);
                        moveList[i+1] = 0;
                        moveList[i+2] = Number(rate);
                        i+=2;
                    }
                }
                if((startPX != "" || startPY != "" || endPX != "" || endPY != "" ) || (multiplication_startPX != "" || multiplication_startPY != "" || multiplication_endPX != "" || multiplication_endPY != "" )){
                    let posArray = glGame.FList[Number(glGame.tmpGroupId)].fishLine[lineID].posArray;
                    if(startPX != ""){
                        posArray[0].x += Number(startPX);
                    }
                    if(startPY != ""){
                        posArray[0].y += Number(startPY);
                    }
                    if(endPX != ""){
                        posArray[posArray.length-1].x += Number(endPX);
                    }
                    if(endPY != ""){
                        posArray[posArray.length-1].y += Number(endPY);
                    }
                    if(multiplication_startPX != ""){
                        posArray[0].x = posArray[0].x * Number(multiplication_startPX);
                    }
                    if(multiplication_startPY != ""){
                        posArray[0].y = posArray[0].y * Number(multiplication_startPY);
                    }
                    if(multiplication_endPX != ""){
                        posArray[posArray.length-1].x = posArray[posArray.length-1].x * Number(multiplication_endPX);
                    }
                    if(multiplication_endPY != ""){
                        posArray[posArray.length-1].y = posArray[posArray.length-1].y * Number(multiplication_endPY);
                    }
                }
            }
            batchOperationFishLine.active = false;
            let info = "保存"
            if(resGroupId != ""){
                info += "默认鱼图 "
            }
            if(showTime != ""){
                info += "出生时间 "
            }
            if(frequency != ""){
                info += "动画帧频 "
            }
            if(rate != ""){
                info += "速率 "
            }
            if(startPX != ""){
                info += "开始点x "
            }
            if(startPY != ""){
                info += "开始点y "
            }
            if(endPX != ""){
                info += "结束点x "
            }
            if(endPY != ""){
                info += "结束点y "
            }
            glGame.editor.status(info+"成功");
            layout.getChildByName("lab_resGroupId").getChildByName("editbox").getComponent(cc.EditBox).string   = "";
            layout.getChildByName("lab_showTime").getChildByName("editbox").getComponent(cc.EditBox).string = "";
            layout.getChildByName("lab_rate").getChildByName("editbox").getComponent(cc.EditBox).string     = "";
            layout.getChildByName("lab_frequency").getChildByName("editbox").getComponent(cc.EditBox).string= "";
            layout.getChildByName("lab_scale").getChildByName("editbox").getComponent(cc.EditBox).string    = "";
            layout.getChildByName("lab_startP_x").getChildByName("editbox").getComponent(cc.EditBox).string = "";
            layout.getChildByName("lab_startP_y").getChildByName("editbox").getComponent(cc.EditBox).string = "";
            layout.getChildByName("lab_endP_x").getChildByName("editbox").getComponent(cc.EditBox).string   = "";
            layout.getChildByName("lab_endP_y").getChildByName("editbox").getComponent(cc.EditBox).string   = "";
            layout.getChildByName("lab_multiplication_startP_x").getChildByName("editbox").getComponent(cc.EditBox).string = "";
            layout.getChildByName("lab_multiplication_startP_y").getChildByName("editbox").getComponent(cc.EditBox).string = "";
            layout.getChildByName("lab_multiplication_endP_x").getChildByName("editbox").getComponent(cc.EditBox).string   = "";
            layout.getChildByName("lab_multiplication_endP_y").getChildByName("editbox").getComponent(cc.EditBox).string   = "";
            this.updateFishLineToCanvas();
        }
        if(evt.currentTarget.name == "optionCopyLineCloseView") {//关闭 选项粘贴鱼线 面板
            glGame.editor.node.getChildByName("chooseFishingLine").active = false;
            let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
            optionCopyLine.active = false;
        }
        if(evt.currentTarget.name == "optionCopyLinePasterCurrentGroupOk") {//选项 粘贴鱼线 本组
            let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
            let num_str = optionCopyLine.getChildByName("bg").getChildByName("numberEditbox").getComponent(cc.EditBox).string;
            let num = num_str == "" ? 1 : Number(num_str);
            this.getOptionCopyLineType();
            glGame.optionCopyLinePasterOtherGroup_time = this.getCopyLineTimeOffSet(0);
            glGame.optionCopyLinePasterOtherGroup_fishTypeId = this.getCopyLinefishTypeId();
            this.copyFishLineToLine(
                glGame.currGIndex,
                glGame.editor.chooseFishID,
                glGame.optionCopyLineType ,
                num,
                glGame.optionCopyLinePasterOtherGroup_time,
                glGame.optionCopyLinePasterOtherGroup_fishTypeId,
                glGame.optionCopyLineTypeReverseElectionX,
                glGame.optionCopyLineTypeReverseElectionY
            );
            glGame.editor.node.getChildByName("chooseFishingLine").active = false;
            optionCopyLine.active = false;
        }
        if(evt.currentTarget.name == "optionCopyLinePasterOtherGroupOk") {//选项 粘贴鱼线 其他组
            let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
            let num_str = optionCopyLine.getChildByName("bg").getChildByName("numberEditbox").getComponent(cc.EditBox).string;
            glGame.optionCopyLinePasterOtherGroup_number = num_str == "" ? 1 : Number(num_str);
            if(!glGame.optionCopyLineType){
                this.getOptionCopyLineType();
            }
            glGame.optionCopyLinePasterOtherGroup_groupID = Number(glGame.currGIndex + "");
            glGame.optionCopyLinePasterOtherGroup_fishID = Number(glGame.editor.chooseFishID + "");
            glGame.optionCopyLinePasterOtherGroup_time = this.getCopyLineTimeOffSet(0);
            glGame.optionCopyLinePasterOtherGroup_fishTypeId = this.getCopyLinefishTypeId();
            glGame.optionCopyLinePasterOtherGroup_type = Number(glGame.optionCopyLineType + "");
            glGame.editor.node.getChildByName("chooseFishingLine").active = false;
            optionCopyLine.active = false;
        }
        if(evt.currentTarget.name == "btn_copyToGroup"){//鱼线复制到某个鱼组
            glGame.editor.node.getChildByName("chooseFishingLine").active = false;
            glGame.copyToGroup = Number(glGame.editor.chooseFishID+"");
            glGame.editor.status("请选择 鱼组列表某个Item 鼠标右键");
        }
        if(evt.currentTarget.name == "btn_Paste"){//粘贴组到这个鱼组
            glGame.editor.node.getChildByName("fishGroupMenu").active = false;
            //跨组拷贝
            this.copyFishLineToGroup(glGame.currGIndex,
                glGame.tmpGroupId,
                glGame.editor.chooseFishID,
                -1,1);
            glGame.copyToGroup = null;
        }
        if(evt.currentTarget.name == "btn_copyLine"){//鱼线 - 拷贝
            glGame.editor.node.getChildByName("chooseFishingLine").active = true;
            glGame.copyLineFIshID = Number(glGame.editor.chooseFishID+"");
            glGame.copyLineFIshID_formGroup = Number(Number(glGame.currGIndex)+"");
            glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_pastFishLine").active = true;
            glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").height = 245;
        }
        if(evt.currentTarget.name == "btn_pastFishLine") {//本组 粘贴 鱼线
            glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").height = 205;
            glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_pastFishLine").active = false;
            //粘贴到 本组
            this.copyFishLineToGroup(glGame.currGIndex,glGame.currGIndex,glGame.copyLineFIshID,-1,1);
            glGame.copyLineFIshID = null;
            glGame.copyLineFIshID_formGroup = null;
            glGame.editor.node.getChildByName("chooseFishingLine").active = false;
        }
        if(evt.currentTarget.name == "btn_PasteLine") {//跨组 粘贴 鱼线
            glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").height = 205;
            glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_pastFishLine").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_PasteLine").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_PasteOptionLine").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").active = false;
            //粘贴到 glGame.tmpGroupId 组
            this.copyFishLineToGroup(
                glGame.copyLineFIshID_formGroup,
                glGame.tmpGroupId,
                glGame.copyLineFIshID,
                -1,
                1,
                glGame.optionCopyLineTypeReverseElectionX,
                glGame.optionCopyLineTypeReverseElectionY
            );
            glGame.copyLineFIshID = null;
            glGame.copyLineFIshID_formGroup = null;
        }
        if(evt.currentTarget.name == "btn_PasteOptionLine") {//跨组 粘贴 选项 鱼线
            glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").height = 205;
            glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_pastFishLine").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_PasteLine").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_PasteOptionLine").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").active = false;
            this.copyFishLineToGroup(
                glGame.optionCopyLinePasterOtherGroup_groupID,
                glGame.tmpGroupId,
                glGame.optionCopyLinePasterOtherGroup_fishID,
                glGame.optionCopyLinePasterOtherGroup_type,
                glGame.optionCopyLinePasterOtherGroup_number,
                glGame.optionCopyLinePasterOtherGroup_time,
                glGame.optionCopyLineTypeReverseElectionX,
                glGame.optionCopyLineTypeReverseElectionY
            );
            glGame.optionCopyLinePasterOtherGroup_groupID = null;
            glGame.optionCopyLinePasterOtherGroup_fishID = null;
            glGame.optionCopyLinePasterOtherGroup_typ = null;
            glGame.optionCopyLinePasterOtherGroup_number = null;
            glGame.optionCopyLinePasterOtherGroup_time = null;
        }
        if(evt.currentTarget.name == "btn_copyGroup"){  //鱼组 - 直接拷贝
            this.copyGroupToGroup(-1);
            glGame.editor.node.getChildByName("fishGroupMenu").active  = false;
        }
        if(evt.currentTarget.name == "btn_showMc" || evt.currentTarget.name == "btn_playGroup" || evt.currentTarget.name == "menu3Button"){//全组播放 、 播放鱼组、右键菜单3 - 播放整组
            this.node.getChildByName("fishGroupProgress").getChildByName("btn_pushGroup").active = true;
            this.node.getChildByName("fishGroupProgress").getChildByName("btn_startPlay").active = !this.node.getChildByName("fishGroupProgress").getChildByName("btn_pushGroup").active;
            this.node.getChildByName("fishGroupProgress").isGroupPlay = true;
            this.node.getChildByName("fishGroupProgress").active = true;
            this.node.getChildByName("fishGroupProgress").getChildByName("slider").getComponent(cc.Slider).progress = 0;
            this.node.getChildByName("fishGroupProgress").getChildByName("progressBar").getComponent(cc.ProgressBar).progress = 0;
            if(glGame.FList){
                let list = glGame.FList[glGame.currGIndex].fishLine;
                let sortArr = [];
                if(list && glGame.GFishList.length > 0){
                    let len = glGame.GFishList.length;
                    for (let i = 0;i<len;i++){
                        let fish = glGame.GFishList[i];
                        let t = Number(fish.getComponent("fish_Unit").getRunTime());
                        let id = fish.lineID;
                        sortArr.push({id:id,t:t});
                    }
                    sortArr.sort((a,b)=>{return b.t-a.t});
                    for (let i = 0;i<len;i++){
                        let fish = glGame.GFishList[i];
                        fish.getComponent("fish_Unit").setMoveData(list[fish.lineID]);
                        let id = fish.lineID;
                        fish.getComponent("fish_Unit").startMove(sortArr[0].id == id);
                    }
                }else{
                    glGame.editor.status("当前没有鱼，无法播放");
                }
            }else{
                glGame.editor.status("当前没有鱼组、鱼，无法播放");
            }
            glGame.editor.node.getChildByName("fishGroupMenu").active  = false;
            this.clickMenu("view_menu2",evt.currentTarget.name);
        }
        if(evt.currentTarget.name == "mask"){//遮罩
        }
        if(evt.currentTarget.name == "btn_closeresSView"){//关闭 资源列表 - 创建鱼 弹出窗
            this.node.getChildByName("creatorFish").active = !this.node.getChildByName("creatorFish").active;
        }
        if(evt.currentTarget.name == "btn_deleteLine"){//鱼线列表 右键菜单 删除鱼线
            let i = 0;
            for(let key in glGame.FList[glGame.currGIndex].fishLine){
                i++;
            }
            if(i<=1){
                glGame.editor.status("当前只有一条鱼了，鱼线列表如需清除直接删除鱼组即可");
                return;
            }
            this.node.getChildByName("chooseFishingLine").active = false;
            delete glGame.FList[glGame.currGIndex].fishLine[Number(glGame.editor.chooseFishID+"")];//移除数据
            this.updateFishLineToCanvas(glGame.editor.chooseFishID);//更新
            glGame.editor.chooseFishID = null;
        }
        if(evt.currentTarget.name == "btn_deleteGroup"){//创建鱼 弹窗 - 创建按钮
            let len = 0;
            for(let key in glGame.FList){
                len++;
            }
            if(len>1){
                if(glGame.tmpGroupId == glGame.currGIndex){//如果删除了当前的组就要清空画布
                    glGame.currLineItem = null;
                    glGame.drawBezier.clearCurrFishLine();
                }
                delete glGame.FList[glGame.tmpGroupId];
                this.updateGroupToCanteinerAndFishLineToCanvas(glGame.tmpGroupId);
                glGame.tmpGroupId = null;
            }else{
                glGame.editor.status("删除失败，最后一个无法删除");
            }
            this.node.getChildByName("fishGroupMenu").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = false;
        }
        if(evt.currentTarget.name == "btn_creat"){//创建鱼 弹窗 - 创建\更新 按钮
            let rate         = this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_rate").getChildByName("editbox").getComponent(cc.EditBox).string;
            if(rate == ""){
                glGame.editor.alert("增加速率");
                return;
            }
            let showTime        = this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_showTime").getChildByName("editbox").getComponent(cc.EditBox).string;
            if(showTime == ""){
                glGame.editor.alert("增加出现时间");
                return;
            }
            this.creatFishData();
        }
        if(evt.currentTarget.name == "btn_outSettingViewClose"){//导出 设置 关闭按钮
           this.node.getChildByName("outSettingView").active = false;
        }
        if(evt.currentTarget.name == "btn_outSetting"){//导出 设置
           this.node.getChildByName("outSettingView").active = true;
        }
        if(evt.currentTarget.name == "btn_out"){//导出 项目 齐全版本
            this.outJson(0);
        }
        if(evt.currentTarget.name == "btn_out2"){//导出 客户端
            this.outJson(1);
        }
        if(evt.currentTarget.name == "btn_out3"){//导出 服务端
            this.outJson(2);
        }
        if(evt.currentTarget.name == "btn_out4"){//打开 个性化导出
            this.initOrReFreshOutSettingView();
            this.node.getChildByName("outSettingView").active = true;
        }
        if(evt.currentTarget.name == "btn_setServerOutConfig"){//开始导出 服务器 预设
            glGame.OutSettingData = glGame.ServerOutConfig;
            this.initOrReFreshOutSettingView();
        }
        if(evt.currentTarget.name == "btn_setClientOutConfig"){//开始导出 客户端 预设
            glGame.OutSettingData = glGame.ClientOutConfig;
            this.initOrReFreshOutSettingView();
        }
        if(evt.currentTarget.name == "btn_setEditOutConfig"){//开始导出 编辑器 预设
            glGame.OutSettingData = glGame.EditOutConfig;
            this.initOrReFreshOutSettingView();
        }
        if(evt.currentTarget.name == "btn_outSettingFishLineJson"){//开始导出 配置导出界面
            this.outPersonaliseJson();
        }
        if(evt.currentTarget.name == "btn_saveSettingFishLineJson"){//保存 配置导出界面  设置 到json
            this.saveOutPersonaliseJsonSetting(true);
            glGame.editor.alert("保存成功！");
        }
        if(evt.currentTarget.name == "btn_readSettingFishLineJson"){//读取 配置导出界面  设置
            if(window.ipcRenderer) window.ipcRenderer.send("readOutSettingData");
        }
        if(evt.currentTarget.name == "btn_in"){//导入鱼线项目文件
            this.clickMenu("view_menu1",evt.currentTarget.name);
            if(window.ipcRenderer)window.ipcRenderer.send("inWindow");
        }
        if(evt.currentTarget.name == "btn_app_close"){//软件 关闭
           if(window.ipcRenderer)window.ipcRenderer.send("closewindow");
        }
        if(evt.currentTarget.name == "btn_app_max"){//软件 最大化
            if(window.ipcRenderer)window.ipcRenderer.send("maxWindow");
        }
        if(evt.currentTarget.name == "btn_app_min"){//软件 最小化
            if(window.ipcRenderer)window.ipcRenderer.send("minWindow");
        }
        if(evt.currentTarget.name == "closeFishGroup"){
            this.node.getChildByName("fishGroupCanteiner").active = !this.node.getChildByName("fishGroupCanteiner").active;
        }
        //鱼资源编辑 界面 导入鱼图资源json
        if(evt.currentTarget.name == "inFishResJsonBtn"){
            if(window.ipcRenderer){
                window.ipcRenderer.send("inFishResJosnFile");
            }
        }
        if (evt.currentTarget.name == "btn_fishTableImport"){//打开 导入鱼表界面
            this.node.getChildByName("fishTableImport").active = true;
        }
        if (evt.currentTarget.name == "btn_closeFishTableImport"){//关闭 导入鱼表界面
            this.node.getChildByName("fishTableImport").active = false;
        }
        if (evt.currentTarget.name == "btn_importExcel"){//导入鱼表按钮
            this.node.getChildByName("fishTableImport").active = false;
            if(window.ipcRenderer)window.ipcRenderer.send("inFishTable");
        }
        if (evt.currentTarget.name == "btn_dowmLoadExp"){//下载模板按钮
            if(window.ipcRenderer)window.ipcRenderer.send("dowmLoadExpFishTable");
        }
        this.node.getChildByName("view_menu1").active = false;
        this.node.getChildByName("view_menu2").active = false;
        this.node.getChildByName("view_menu3").active = false;
        cc.warn(">> click ",evt.currentTarget.name)
    },
    //撤销
    btn_revoke(){
        if(glGame.currentFish != null){
            //删除最后一个
            if(glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].posArray.length > 4){

                glGame.isAdd = false;
                if(glGame.RestoreFList == null){
                    glGame.RestoreFList = [];
                    glGame.RestoreIndex = 0;
                }

                glGame.RestoreFList.push(JSON.parse(JSON.stringify(glGame.FList)));
                while(glGame.RestoreFList.length > 10){
                    glGame.RestoreFList.shift();
                }

                glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].posArray.pop();
                glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].posArray.pop();
                glGame.editor.getFishToCanvas(glGame.currentFish.lineID);
            }else{
                glGame.editor.status("无法删除最后3根线");
            }
        }else{
            glGame.editor.status("暂无恢复");
        }
    },
    //重做
    btn_redo(){
        if(glGame.currentFish != null){
            if(glGame.RestoreFList != null && glGame.RestoreFList.length > 0){
                glGame.FList = glGame.RestoreFList.pop();
                glGame.editor.getFishToCanvas(glGame.currentFish.lineID);
            }else{
                glGame.editor.status("没有可以恢复的数据了");
            }
        }else{
            glGame.editor.status("暂无恢复");
        }
    },
    //type == 0 编辑器 ， 1 客户端 ，2服务端
    outJson(type){
        let newD = JSON.parse(JSON.stringify(glGame.FList));
        for (let groupID in newD){
            let fishLine = newD[groupID].fishLine;
            if(type == 1 || type == 2){
                delete newD[groupID].desc;
            }
            for (let fishID in fishLine){
                let line = fishLine[fishID];
                line.runTime = glGame.getMaxIndexByTime(line.posArray,line.moveList);//模拟运行，计算运行时间
                line.edgeList = glGame.edgeComputingToTime(line.posArray,line.moveList,line.runTime,Number(line.showTime.toFixed(2)));//计算到达边缘点时间
                for (let i=0;i<line.posArray.length;i++){
                    let p = line.posArray[i];
                    p.x = Number(p.x.toFixed(1));
                    p.y = Number(p.y.toFixed(1));
                    if(p.z != undefined){
                        delete p.z;
                    }
                }
                for (let i=0;i<line.moveList.length;i++){
                    if(line.moveList[i])line.moveList[i] = Number(line.moveList[i].toFixed(2));
                }
                //删除无意义字段
                if(fishLine[fishID].resID != null){
                    delete fishLine[fishID].resID;
                }
                if(fishLine[fishID].groupID != null){
                    delete fishLine[fishID].groupID;
                }
                if(type == 2 && fishLine[fishID].posArray != null){
                    delete fishLine[fishID].posArray;
                }
                if(type == 2 && fishLine[fishID].moveList != null){
                    delete fishLine[fishID].moveList;
                }
                if(type == 2 && fishLine[fishID].frequency != null){
                    delete fishLine[fishID].frequency;
                }
                if(type == 1 || type == 2 && fishLine[fishID].desc != null){
                    delete fishLine[fishID].desc;
                }
                if(type == 1 || type == 2 && fishLine[fishID].resType != null){
                    delete fishLine[fishID].resType;
                }
                if(type == 1 || type == 2 && fishLine[fishID].scale != null){
                    delete fishLine[fishID].scale;
                }
                if(type == 1 && fishLine[fishID].edgeList != null){
                    delete fishLine[fishID].edgeList;
                }
            }
        }
        if(window.ipcRenderer) window.ipcRenderer.send("outjson",JSON.stringify(newD));
    },
    //设置 配置导出界面 导出面板
    initOrReFreshOutSettingView(){
        if(glGame.OutSettingData != null) {
            let outSettingView = this.node.getChildByName("outSettingView");
            let lineLayout = outSettingView.getChildByName("line_layout");
            let groupLayout = outSettingView.getChildByName("group_layout");
            for (let i = 0;i<lineLayout.childrenCount;i++){
                let toggle = lineLayout.children[i].getChildByName("isOutToggle").getComponent(cc.Toggle);
                let key = lineLayout.children[i].name;
                if(glGame.OutSettingData.line[key] != null && glGame.OutSettingData.line[key] != ""){
                    lineLayout.children[i].getComponent(cc.EditBox).string = glGame.OutSettingData.line[key];
                }
                toggle.isChecked = glGame.OutSettingData.line_isOut[key];
            }
            for (let i = 0;i<groupLayout.childrenCount;i++){
                let toggle = groupLayout.children[i].getChildByName("isOutToggle").getComponent(cc.Toggle);
                let key = groupLayout.children[i].name;
                if(glGame.OutSettingData.group[key] != null && glGame.OutSettingData.group[key] != ""){
                    groupLayout.children[i].getComponent(cc.EditBox).string = glGame.OutSettingData.group[key];
                }
                toggle.isChecked = glGame.OutSettingData.group_isOut[key];
            }
        }
    },
    //编辑设置信息
    saveOutPersonaliseJsonSetting(isSave){
        if(glGame.OutSettingData == null) {
            glGame.OutSettingData = {};
            glGame.OutSettingData.line = {};
            glGame.OutSettingData.line_isOut = {};
            glGame.OutSettingData.group = {};
            glGame.OutSettingData.group_isOut = {};
        }
        let outSettingView = this.node.getChildByName("outSettingView");
        let lineLayout = outSettingView.getChildByName("line_layout");
        let groupLayout = outSettingView.getChildByName("group_layout");
        for (let i = 0;i<lineLayout.childrenCount;i++){
            let toggle = lineLayout.children[i].getChildByName("isOutToggle").getComponent(cc.Toggle);
            let key = lineLayout.children[i].name;
            let newKey = lineLayout.children[i].getComponent(cc.EditBox).string.replace(/\s+/g,"")+"";//去掉所有空格
            glGame.OutSettingData.line[key] = newKey != "" ? newKey : key;
            glGame.OutSettingData.line_isOut[key] = toggle.isChecked;

        }
        for (let i = 0;i<groupLayout.childrenCount;i++){
            let toggle = groupLayout.children[i].getChildByName("isOutToggle").getComponent(cc.Toggle);
            let key = groupLayout.children[i].name;
            let newKey = groupLayout.children[i].getComponent(cc.EditBox).string.replace(/\s+/g,"")+"";//去掉所有空格
            glGame.OutSettingData.group[key] = newKey != "" ? newKey : key;
            glGame.OutSettingData.group_isOut[key] = toggle.isChecked;

        }
        if(isSave){
            if(window.ipcRenderer) window.ipcRenderer.send("OutSettingData",JSON.stringify(glGame.OutSettingData));
        }
    },
    //配置导出界面 导出
    outPersonaliseJson(){
        this.saveOutPersonaliseJsonSetting(false);
        console.warn("glGame.OutSettingData  配置导出界面 导出   配置 > ",glGame.OutSettingData);
        let newD = JSON.parse(JSON.stringify(glGame.FList));
        //重新 计算 runTime、edgeList 缩短 line.posArray、line.moveList int数值长度
        for (let groupID in newD){
            let fishLine = newD[groupID].fishLine;
            for (let lineID in fishLine){
                let line = fishLine[lineID];
                line.runTime = glGame.getMaxIndexByTime(line.posArray,line.moveList);//模拟运行，计算运行时间
                line.edgeList = glGame.edgeComputingToTime(line.posArray,line.moveList,line.runTime,Number(line.showTime.toFixed(2)));//计算到达边缘点时间
                for (let i=0;i<line.posArray.length;i++){
                    let p = line.posArray[i];
                    p.x = Number(p.x.toFixed(1));
                    p.y = Number(p.y.toFixed(1));
                    if(p.z != undefined){
                        delete p.z;
                    }
                }
                for (let i=0;i<line.moveList.length;i++){
                    if(line.moveList[i])line.moveList[i] = Number(line.moveList[i].toFixed(2));
                }
            }
        }
        //改键名
        for (let groupID in newD){
            let data = newD[groupID];
            let fishLine = newD[groupID].fishLine;
            for (let lineID in fishLine){
                let line = fishLine[lineID];
                if(glGame.OutSettingData.line_isOut["groupID"] != null && glGame.OutSettingData.line_isOut["groupID"] == false){//是否保留 groupID
                    delete line.groupID;
                }else{
                    if(glGame.OutSettingData.line["groupID"] != null && glGame.OutSettingData.line["groupID"] != "" && glGame.OutSettingData.line["groupID"] != "groupID"){//是否改key
                        line[glGame.OutSettingData.line["groupID"]] = Number(line.groupID+"");
                        delete line.groupID;
                    }
                }
                if(glGame.OutSettingData.line_isOut["lineID"] != null && glGame.OutSettingData.line_isOut["lineID"] == false){//是否保留 lineID
                    delete line.lineID;
                }else{
                    if(glGame.OutSettingData.line["lineID"] != null && glGame.OutSettingData.line["lineID"] != "" && glGame.OutSettingData.line["lineID"] != "lineID"){//是否改key
                        line[glGame.OutSettingData.line["lineID"]] = Number(line.lineID+"");
                        delete line.lineID;
                    }
                }

                if(glGame.OutSettingData.line_isOut["resGroupId"] != null && glGame.OutSettingData.line_isOut["resGroupId"] == false){//是否保留 resGroupId
                    delete line.resGroupId;
                }else{
                    if(glGame.OutSettingData.line["resGroupId"] != null && glGame.OutSettingData.line["resGroupId"] != "" && glGame.OutSettingData.line["resGroupId"] != "resGroupId"){//是否改key
                        line[glGame.OutSettingData.line["resGroupId"]] = Number(line.resGroupId+"");
                        delete line.resGroupId;
                    }
                }
                if(glGame.OutSettingData.line_isOut["fishTypeId"] != null && glGame.OutSettingData.line_isOut["fishTypeId"] == false){//是否保留 fishTypeId
                    delete line.fishTypeId;
                }else{
                    if(glGame.OutSettingData.line["fishTypeId"] != null && glGame.OutSettingData.line["fishTypeId"] != "" && glGame.OutSettingData.line["fishTypeId"] != "fishTypeId"){//是否改key
                        line[glGame.OutSettingData.line["fishTypeId"]] = Number(line.fishTypeId+"");
                        delete line.fishTypeId;
                    }
                }
                if(glGame.OutSettingData.line_isOut["showTime"] != null && glGame.OutSettingData.line_isOut["showTime"] == false){//是否保留 showTime
                    delete line.showTime;
                }else{
                    if(glGame.OutSettingData.line["showTime"] != null && glGame.OutSettingData.line["showTime"] != "" && glGame.OutSettingData.line["showTime"] != "showTime"){//是否改key
                        line[glGame.OutSettingData.line["showTime"]] = Number(line.showTime+"");
                        delete line.showTime;
                    }
                }
                if(glGame.OutSettingData.line_isOut["frequency"] != null && glGame.OutSettingData.line_isOut["frequency"] == false){//是否保留 frequency
                    delete line.frequency;
                }else{
                    if(glGame.OutSettingData.line["frequency"] != null && glGame.OutSettingData.line["frequency"] != "" && glGame.OutSettingData.line["frequency"] != "frequency"){//是否改key
                        line[glGame.OutSettingData.line["frequency"]] = Number(line.frequency+"");
                        delete line.frequency;
                    }
                }
                if(glGame.OutSettingData.line_isOut["rate"] != null && glGame.OutSettingData.line_isOut["rate"] == false){//是否保留 rate
                    delete line.rate;
                }else{
                    if(glGame.OutSettingData.line["rate"] != null && glGame.OutSettingData.line["rate"] != "" && glGame.OutSettingData.line["rate"] != "rate"){//是否改key
                        line[glGame.OutSettingData.line["rate"]] = Number(line.rate+"");
                        delete line.rate;
                    }
                }
                if(glGame.OutSettingData.line_isOut["scale"] != null && glGame.OutSettingData.line_isOut["scale"] == false){//是否保留 scale
                    delete line.scale;
                }else{
                    if(glGame.OutSettingData.line["scale"] != null && glGame.OutSettingData.line["scale"] != "" && glGame.OutSettingData.line["scale"] != "scale"){//是否改key
                        line[glGame.OutSettingData.line["scale"]] = Number(line.scale+"");
                        delete line.scale;
                    }
                }
                if(glGame.OutSettingData.line_isOut["desc"] != null && glGame.OutSettingData.line_isOut["desc"] == false){//是否保留 desc
                    delete line.desc;
                }else{
                    if(glGame.OutSettingData.line["desc"] != null && glGame.OutSettingData.line["desc"] != "" && glGame.OutSettingData.line["desc"] != "desc"){//是否改key
                        line[glGame.OutSettingData.line["desc"]] = line.desc+"";
                        delete line.desc;
                    }
                }

                if(glGame.OutSettingData.line_isOut["runTime"] != null && glGame.OutSettingData.line_isOut["runTime"] == false){//是否保留 runTime
                    delete line.runTime;
                }else{
                    if(glGame.OutSettingData.line["runTime"] != null && glGame.OutSettingData.line["runTime"] != "" && glGame.OutSettingData.line["runTime"] != "runTime"){//是否改key
                        line[glGame.OutSettingData.line["runTime"]] = Number(line.runTime+"");
                        delete line.runTime;
                    }
                }
                if(glGame.OutSettingData.line_isOut["posArray"] != null && glGame.OutSettingData.line_isOut["posArray"] == false){//是否保留 posArray
                    delete line.posArray;
                }else{
                    if(glGame.OutSettingData.line["posArray"] != null && glGame.OutSettingData.line["posArray"] != "" && glGame.OutSettingData.line["posArray"] != "posArray"){//是否改key
                        line[glGame.OutSettingData.line["posArray"]] = line.posArray;
                        delete line.posArray;
                    }
                }
                if(glGame.OutSettingData.line_isOut["moveList"] != null && glGame.OutSettingData.line_isOut["moveList"] == false){//是否保留 moveList
                    delete line.moveList;
                }else{
                    if(glGame.OutSettingData.line["moveList"] != null && glGame.OutSettingData.line["moveList"] != "" && glGame.OutSettingData.line["moveList"] != "moveList"){//是否改key
                        line[glGame.OutSettingData.line["moveList"]] = line.moveList;
                        delete line.moveList;
                    }
                }
                if(glGame.OutSettingData.line_isOut["edgeList"] != null && glGame.OutSettingData.line_isOut["edgeList"] == false){//是否保留 edgeList
                    delete line.edgeList;
                }else{
                    if(glGame.OutSettingData.line["edgeList"] != null && glGame.OutSettingData.line["edgeList"] != "" && glGame.OutSettingData.line["edgeList"] != "edgeList"){//是否改key
                        line[glGame.OutSettingData.line["edgeList"]] = line.edgeList;
                        delete line.edgeList;
                    }
                }
            }

            if(glGame.OutSettingData.group_isOut["id"] != null && glGame.OutSettingData.group_isOut["id"] == false){//是否保留 id
                delete data.id;
            }else{
                if(glGame.OutSettingData.group["id"] != null && glGame.OutSettingData.group["id"] != "" && glGame.OutSettingData.group["id"] != "id"){//是否改key
                    data[glGame.OutSettingData.group["id"]] = data.id;
                    delete data.id;
                }
            }
            if(glGame.OutSettingData.group_isOut["fishLine"] != null && glGame.OutSettingData.group_isOut["fishLine"] == false){//是否保留 fishLine
                delete data.fishLine;
            }else{
                if(glGame.OutSettingData.group["fishLine"] != null && glGame.OutSettingData.group["fishLine"] != "" && glGame.OutSettingData.group["fishLine"] != "fishLine"){//是否改key
                    data[glGame.OutSettingData.group["fishLine"]] = data.fishLine;
                    delete data.fishLine;
                }
            }
            if(glGame.OutSettingData.group_isOut["type"] != null && glGame.OutSettingData.group_isOut["type"] == false){//是否保留 type
                delete data.type;
            }else{
                if(glGame.OutSettingData.group["type"] != null && glGame.OutSettingData.group["type"] != "" && glGame.OutSettingData.group["type"] != "type"){//是否改key type
                    data[glGame.OutSettingData.group["type"]] = data.type;
                    delete data.type;
                }
            }
            if(glGame.OutSettingData.group_isOut["range"] != null && glGame.OutSettingData.group_isOut["range"] == false){//是否保留 range
                delete data.range;
            }else{
                if(glGame.OutSettingData.group["range"] != null && glGame.OutSettingData.group["range"] != "" && glGame.OutSettingData.group["range"] != "range"){//是否改key
                    data[glGame.OutSettingData.group["range"]] = data.range;
                    delete data.range;
                }
            }
            if(glGame.OutSettingData.group_isOut["desc"] != null && glGame.OutSettingData.group_isOut["desc"] == false){//是否保留 desc
                delete data.desc;
            }else{
                if(glGame.OutSettingData.group["desc"] != null && glGame.OutSettingData.group["desc"] != "" && glGame.OutSettingData.group["desc"] != "desc"){//是否改key
                    data[glGame.OutSettingData.group["desc"]] = data.desc;
                    delete data.desc;
                }
            }
        }
        if(window.ipcRenderer) window.ipcRenderer.send("outjson",JSON.stringify(newD));
    },
    //获取鱼线 - 选项复制 - 类型
    getOptionCopyLineType(){
        let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
        let bgContainer = optionCopyLine.getChildByName("bg");
        let toggleContainer = bgContainer.getChildByName("toggleContainer");
        let type       = 0;
        for (let i=0;i<toggleContainer.childrenCount;i++){
            if(toggleContainer.children[i].getComponent(cc.Toggle).isChecked){
                let name = toggleContainer.children[i].name;
                type = Number(name.split("optionCopyLineToggle")[1]);
                break;
            }
        }
        glGame.optionCopyLineType = type;
        glGame.optionCopyLineTypeReverseElectionX = bgContainer.getChildByName("toggleX").getComponent(cc.Toggle).isChecked ? 1 : 0;
        glGame.optionCopyLineTypeReverseElectionY = bgContainer.getChildByName("toggleY").getComponent(cc.Toggle).isChecked ? 1 : 0;
        console.warn(">>x翻转选项 glGame.optionCopyLineTypeReverseElectionX ",glGame.optionCopyLineTypeReverseElectionX)
        console.warn(">>y翻转选项 glGame.optionCopyLineTypeReverseElectionY ",glGame.optionCopyLineTypeReverseElectionY)
    },
    //Toggle 点击事件
    clickToggle(evt){
        if(evt.target.name.indexOf("optionCopyLineToggle") != -1) {//复制鱼线 选项 类型
            glGame.optionCopyLineType = Number(evt.target.name.split("optionCopyLineToggle")[1]);
        }
        if(evt.target.name.indexOf("optionCopyGroupToggle") != -1) {//复制鱼组 选项
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = false;
            let type = Number(evt.target.name.split("optionCopyGroupToggle")[1]);
            this.copyGroupToGroup(type);
            glGame.editor.node.getChildByName("fishGroupMenu").active = false;
            glGame.editor.node.getChildByName("fishGroupMenu").getChildByName("bg").getChildByName("btn_copyGroupOption").getChildByName("optionCopyGroup").active = false;
        }
        if(evt.target.name.indexOf("newpostoggle") != -1){
            let newpos = Number(evt.target.name.split("newpostoggle")[1]);
            let arr = glGame.P13[Number(newpos)];
            glGame.startPoint = arr[0];    //创建鱼的第一条 贝塞尔 线 开始点
            glGame.controlPoint = arr[1];  //创建鱼的第一条 贝塞尔 线 控制点
            glGame.endPoint = arr[2];       //创建鱼的第一条 贝塞尔 线 结束点
        }
    },
    //打开关于界面
    openAbout(){
        if(this.node.getChildByName("view_about").active)return;
        this.node.getChildByName("view_about").stopAllActions();
        this.node.getChildByName("view_about").opacity = 0;
        this.node.getChildByName("view_about").active = true;
        this.node.getChildByName("view_about").runAction(cc.fadeTo(0.3,255));
    },
    //关闭关于界面
    closeAbout(){
        this.node.getChildByName("view_about").active = false;
    },
    //点击菜单
    clickMenu(menuName,btnName){
        this.node.getChildByName(menuName).active = false;
    },
    //创建鱼到资源列表
    creatorFishForResView(){
        cc.warn(" 1 > 创建鱼到资源列表  glGame.fishTable ",glGame.fishTable)
        this.node.getChildByName("fishTableImport").active = false;
        let content = this.node.getChildByName("fishCanteiner").getChildByName("fishScrollView").getChildByName("view").getChildByName("content");
        content.removeAllChildren(true);
        let fish = this.node.getChildByName("fishCanteiner").getChildByName("fish");
        for (let fishTypeId in glGame.fishTable){
            let item = glGame.fishTable[fishTypeId];
            let filename = glGame.filePreFix+item.resGroupId;
            let sprthis = glGame.getAtlasForTexture(filename,filename+"_move1");
            if(sprthis){
                let scale = 130 / sprthis.getOriginalSize().width;
                let newFish = cc.instantiate(fish);
                newFish.fishTypeId = Number(fishTypeId);
                newFish.filename = filename;
                newFish.name = "resList_fish_"+item.resGroupId
                newFish.active = true;
                newFish.parent = null;
                newFish.width  = sprthis.getOriginalSize().width * scale;
                newFish.height = sprthis.getOriginalSize().height * scale;
                content.addChild(newFish);
                content.height += newFish.height;
                let data = glGame.editor.getFishResConfig(Number(fishTypeId));
                let baseFrameRate   = Number(data.frameRate) * 10;//动态获取频率
                newFish.getComponent("fish_Unit").initResEditorFish(filename,130,1,baseFrameRate);
            }else{
                cc.warn("> 创建鱼到资源列表 无法加载的资源 filename ",filename," sprthis ",sprthis)
            }
        }
    },
    //打开创建鱼界面 鱼线创建 创建鱼线
    showCreatFishView(isCreat){
        glGame.editor.node.getChildByName("creatorFish").active = true;
        glGame.isCreat = isCreat;
        if(glGame.isCreat){
            glGame.editor.node.getChildByName("creatorFish").getChildByName("selectList").active = true;
            glGame.editor.node.getChildByName("creatorFish").getChildByName("btn_creat").getChildByName("Background").getChildByName("Label").getComponent(cc.Label).string = "创建"
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_lineId").getChildByName("mask").active = false;
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_rate").getChildByName("mask").active = false;
            let newID = glGame.lineID+glGame.GFishList.length+1;
            let baseFishInfo = glGame.editor.getFishResConfig(this.clickFishTableTypeFishId);
            let fishName = baseFishInfo.fishName;
            cc.warn(">> baseFishInfo ",baseFishInfo)
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_resGroupId").getChildByName("editbox").getComponent(cc.EditBox).string = baseFishInfo.resGroupId+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_lineId").getChildByName("editbox").getComponent(cc.EditBox).string = newID+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_fishTypeId").getChildByName("editbox").getComponent(cc.EditBox).string = this.clickFishTableTypeFishId+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_group").getComponent(cc.Label).string = glGame.currGIndex+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_rate").getChildByName("editbox").getComponent(cc.EditBox).string = glGame.speed;
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_frequency").getChildByName("editbox").getComponent(cc.EditBox).string = glGame.runSpeed;
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_scale").getChildByName("editbox").getComponent(cc.EditBox).string = glGame.scale;
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_showTime").getChildByName("editbox").getComponent(cc.EditBox).string = glGame.showTime;
            this.node.getChildByName("creatorFish").getChildByName("lab_title").getComponent(cc.Label).string = "创建 resGroupId:"+baseFishInfo.resGroupId+" ("+fishName+")";
        }
        else{
            glGame.editor.node.getChildByName("creatorFish").getChildByName("selectList").active = false;
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_rate").getChildByName("mask").active = true;
            glGame.editor.node.getChildByName("creatorFish").getChildByName("btn_creat").getChildByName("Background").getChildByName("Label").getComponent(cc.Label).string = "更新"
            glGame.editor.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_group").getComponent(cc.Label).string = glGame.currGIndex+"";
            let info = glGame.FList[glGame.currGIndex].fishLine[glGame.editor.chooseFishID];
            this.node.getChildByName("creatorFish").getChildByName("lab_title").getComponent(cc.Label).string = "鱼线信息 "+glGame.editor.chooseFishID;
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_resGroupId").getChildByName("editbox").getComponent(cc.EditBox).string = info.resGroupId+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_lineId").getChildByName("mask").active = true;
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_fishTypeId").getChildByName("editbox").getComponent(cc.EditBox).string = info.fishTypeId+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_lineId").getChildByName("editbox").getComponent(cc.EditBox).string = glGame.editor.chooseFishID+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_showTime").getChildByName("editbox").getComponent(cc.EditBox).string = info.showTime+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_rate").getChildByName("editbox").getComponent(cc.EditBox).string = info.rate+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_frequency").getChildByName("editbox").getComponent(cc.EditBox).string = info.frequency+"";
            this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_scale").getChildByName("editbox").getComponent(cc.EditBox).string = info.scale+"";
            this.node.getChildByName("creatorFish").getChildByName("desc_editbox").getComponent(cc.EditBox).string = (info.desc ? info.desc : "")+"";
            this.node.getChildByName("creatorFish").getChildByName("startPointSetting").getChildByName("start_editboxX").getComponent(cc.EditBox).string = info.posArray[0].x;
            this.node.getChildByName("creatorFish").getChildByName("startPointSetting").getChildByName("start_editboxY").getComponent(cc.EditBox).string = info.posArray[0].y;
            this.node.getChildByName("creatorFish").getChildByName("startPointSetting").getChildByName("control_editboxX").getComponent(cc.EditBox).string = info.posArray[1].x;
            this.node.getChildByName("creatorFish").getChildByName("startPointSetting").getChildByName("control_editboxY").getComponent(cc.EditBox).string = info.posArray[1].y;
            this.node.getChildByName("creatorFish").getChildByName("startPointSetting").getChildByName("end_editboxX").getComponent(cc.EditBox).string = info.posArray[2].x;
            this.node.getChildByName("creatorFish").getChildByName("startPointSetting").getChildByName("end_editboxY").getComponent(cc.EditBox).string = info.posArray[2].y;
        }

        this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_fishTypeId").getChildByName("editbox").on("text-changed", (editbox) => {
            let _fishTypeId = editbox.string;
            if(_fishTypeId == null || _fishTypeId == "" || isNaN(_fishTypeId)){//输入校验 必须输入合法的
                cc.warn(">> 输入校验 lab_fishTypeId text-changed ",_fishTypeId)
                return;
            }
            let data = glGame.fishTable[Number(_fishTypeId)];
            if(data != null){
                cc.warn(">> lab_fishTypeId text-changed new data ",data)
                this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_resGroupId").getChildByName("editbox").getComponent(cc.EditBox).string = data.resGroupId+"";
            }else{
                glGame.editor.status("请填写正确的fishTypeId");
            }
        })
    },
    //创建鱼界面点 确定 - 开始创建
    creatFishData(){
        glGame.editor.node.getChildByName("creatorFish").active = false;
        let desc            = this.node.getChildByName("creatorFish").getChildByName("desc_editbox").getComponent(cc.EditBox).string;
        let resGroupId      = Number(this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_resGroupId").getChildByName("editbox").getComponent(cc.EditBox).string);
        let fishTypeId      = Number(this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_fishTypeId").getChildByName("editbox").getComponent(cc.EditBox).string);
        let lineID          = Number(this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_lineId").getChildByName("editbox").getComponent(cc.EditBox).string);
        let showTime        = Number(this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_showTime").getChildByName("editbox").getComponent(cc.EditBox).string);
        let rate            = Number(this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_rate").getChildByName("editbox").getComponent(cc.EditBox).string);
        let frequency       = Number(this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_frequency").getChildByName("editbox").getComponent(cc.EditBox).string);
        let scale           = Number(this.node.getChildByName("creatorFish").getChildByName("layout").getChildByName("lab_scale").getChildByName("editbox").getComponent(cc.EditBox).string);
        if(glGame.isCreat){
            glGame.speed = rate;//修改全局速度默认值
            let posArray        = [glGame.startPoint,glGame.controlPoint,glGame.endPoint];  //初始化值 - 3个贝塞尔 点
            let moveList        = [glGame.speed,glGame.speed,glGame.speed];                  //初始化值 - 3个速率
            let runTime = glGame.getMaxIndexByTime(posArray,moveList);
            glGame.addNewLineId = lineID;
            console.error("> 创建鱼界面点 确定 - 开始创建 addNewLineId " + glGame.addNewLineId);
            //贝塞尔 鱼线集 数据 格式
            glGame.FList[glGame.currGIndex].fishLine[lineID] = {
                groupID:glGame.currGIndex,
                lineID:lineID,
                resGroupId:resGroupId,
                fishTypeId:fishTypeId,
                showTime:showTime,
                frequency:frequency,
                rate:rate,
                scale:scale,
                desc:desc,
                runTime:runTime,
                posArray:posArray,
                moveList:moveList
            };
            if(!glGame.drawStart){
                glGame.editor.status("TIPS: 贝塞尔点，鼠标右键即可删除",glGame.Color.RED);
                this.scheduleOnce(()=>{
                    glGame.editor.status("当前鱼组ID "+glGame.currGIndex);
                },3);
            }else {
                glGame.editor.status("当前鱼组ID "+glGame.currGIndex);
            }

            glGame.currLineItem = glGame.FList[glGame.currGIndex].fishLine[glGame.lineID];
            glGame.currLineItem = glGame.FList[glGame.currGIndex].fishLine[lineID];//设置选中当前鱼
            glGame.editor.updateFishLineToCanvas();
            cc.warn(">>> glGame.speed "+glGame.speed)
        }else{
            //更新信息
            if(showTime != null && !isNaN(Number(showTime))){
                glGame.FList[glGame.currGIndex].fishLine[lineID].showTime = Number(showTime);
            }
            if(resGroupId != null && !isNaN(Number(resGroupId))){
                glGame.FList[glGame.currGIndex].fishLine[lineID].resGroupId = Number(resGroupId);
            }
            if(fishTypeId != null && !isNaN(Number(fishTypeId))){
                glGame.FList[glGame.currGIndex].fishLine[lineID].fishTypeId = Number(fishTypeId);
            }
            if(rate != null && !isNaN(Number(rate))){
                glGame.FList[glGame.currGIndex].fishLine[lineID].rate = Number(rate);
            }
            if(frequency != null && !isNaN(Number(frequency))){
                glGame.FList[glGame.currGIndex].fishLine[lineID].frequency = Number(frequency);
            }
            if(scale != null && !isNaN(Number(scale))){
                glGame.FList[glGame.currGIndex].fishLine[lineID].scale = Number(scale);
            }
            if(desc != undefined && desc != ""){
                glGame.FList[glGame.currGIndex].fishLine[lineID].desc = desc;
            }
            glGame.editor.updateFishLineToCanvas(null,lineID);
        }
    },
    //创建鱼 对象
    creatFishUnitToDeskUI(lID,resGroupId,resType,pos,scale,frequency){
        let deskUI = this.node.getChildByName("deskUI");
        let newFish = cc.instantiate(this.node.getChildByName("fishCanteiner").getChildByName("fish2"));
        newFish.active = true;
        newFish.name = "fish_"+lID;
        newFish.parent = deskUI;
        if(pos)newFish.position = pos;
        newFish.getComponent("fish_Unit").initEditorFish(resGroupId,resType,scale,frequency);
        return newFish;
    },
    //更新 鱼组鱼线数据 并且到画布
    updateFishLineToCanvas(chooseFishID = null,selectFishID = null,isRef = false){
        let FContent = this.node.getChildByName("fishLineCanteiner").getChildByName("fishLineScrollView").getChildByName("view").getChildByName("content");
        if(chooseFishID){
            if(glGame.currLineItem && glGame.currLineItem.lineID == chooseFishID){//如果删除的鱼线和当前的一样那么就移除选择
                let list = glGame.FList[glGame.currGIndex].fishLine;
                if(list){
                    for (let lineID in list){
                        if(glGame.currLineItem.lineID != lineID){
                            glGame.currLineItem = list[lineID];
                            this.getFishToCanvas(glGame.currentFish.lineID);
                            break;
                        }
                    }
                }
                let it = FContent.getChildByName("Fish_"+chooseFishID);
                FContent.height -= it.height - 2;
                it.destroy();
                return;
            }else {
                let it = FContent.getChildByName("Fish_"+chooseFishID);
                FContent.height -= it.height - 2;
                it.destroy();
                return;
            }
        }
        if(glGame.addNewLineId != null){//添加鱼不刷新鱼线列表
            let lineID2 = Number(glGame.addNewLineId + "");
            let addFishData = glGame.FList[glGame.currGIndex].fishLine[lineID2];
            if(glGame.currentFish){
                glGame.currentFish = null;
            }
            this.addLine(addFishData,lineID2);
            if(glGame.currentFish) {
                this.getFishToCanvas(glGame.currentFish.lineID);
            }
            glGame.addNewLineId = null;
            return;
        }
        if(selectFishID != null){
            let deskUI = this.node.getChildByName("deskUI");
            glGame.currentFish = deskUI.getChildByName("fish_"+selectFishID);
            this.getFishToCanvas(glGame.currentFish.lineID);
            return;
        }
        if(!isRef){
            FContent.removeAllChildren(true);
            FContent.height = 0;
        }
        if(glGame.currentFish){
            glGame.currentFish = null;
        }
        if(glGame.GFishList && glGame.GFishList.length > 0){
            let len = glGame.GFishList.length;
            for (let i = 0;i<len;i++){
                let f = glGame.GFishList.pop();
                if(f && f._components != undefined && f.getComponent("fish_Unit"))f.getComponent("fish_Unit").dispose();
            }
        }
        glGame.GFishList = [];
        let list;
        let searchLen = 0;
        if(glGame.searchList != undefined) {
            for (let k in glGame.searchList) {
                searchLen++;
            }
        }
        //使用搜索结果
        if(searchLen > 0){
            list = glGame.searchList;
        }else{//使用默认结果
            if(glGame.FList[glGame.currGIndex]){
                list = glGame.FList[glGame.currGIndex].fishLine;
            }
        }
        if(list){
            for (let key in list){
                let lineID      = Number(key);
                let data        = list[lineID];
                if(isRef){
                    if(FContent.getChildByName("Fish_"+lineID) == null){
                        this.addLine(data,lineID);
                    }
                }else{
                    this.addLine(data,lineID);
                }
            }
            if(glGame.currentFish){
                this.getFishToCanvas(glGame.currentFish.lineID);
            }else{//只创建了组 未创建鱼

            }
        }else{
            glGame.editor.status("当前鱼组是空的，请创建一条鱼！");
        }
    },
    //添加鱼线
    addLine(data,lineID){
        if(data){
            let FContent        = this.node.getChildByName("fishLineCanteiner").getChildByName("fishLineScrollView").getChildByName("view").getChildByName("content");
            let FItem           = this.node.getChildByName("fishLineCanteiner").getChildByName("LineItem");
            let pos             = data.posArray[0];
            let baseFrameRate   = Number(glGame.editor.getFishResConfig(Number(data.fishTypeId)).frameRate);//动态获取频率 * 倍率
            let newFish         = this.creatFishUnitToDeskUI(lineID,data.resGroupId,data.resType,pos,data.scale,baseFrameRate * data.frequency * 10);
            newFish.lineID      = lineID;
            newFish.fishTypeId  = Number(data.fishTypeId);
            glGame.GFishList.push(newFish);
            newFish.getComponent("fish_Unit").setMoveData(data);
            let item            = cc.instantiate(FItem);
            item.active         = true;
            item.fishData       = data;
            item.lineID         = lineID;
            item.fishTypeId     = Number(data.fishTypeId);
            item.name           = "Fish_"+lineID;
            let fishName;
            if(glGame.fishTable[Number(data.fishTypeId)] == null){
                fishName = "找不到配置 "+data.fishTypeId;
                cc.error(" 找不到配置,请检查鱼表配置 : ",data.fishTypeId," glGame.fishTable ",glGame.fishTable);
            }else{
                fishName = glGame.fishTable[Number(data.fishTypeId)].fishName;
            }

            item.filename       = glGame.filePreFix+data.resGroupId;
            item.getChildByName("lab_name").getComponent(cc.Label).string = fishName+"_"+lineID;
            if(glGame.currLineItem != null && glGame.currLineItem.lineID == lineID && glGame.currentFish == null){
                glGame.currLineItem = data;
                glGame.currentFish  = newFish;
                if(glGame.lastItemNode && glGame.lastItemNode.getChildByName("heightLine")){
                    glGame.lastItemNode.getChildByName("heightLine").active = false;
                }
                glGame.lastItemNode = item;
                glGame.lastItemNode.getChildByName("heightLine").active = true;
            }
            FContent.addChild(item);
            FContent.height += item.height + 50;
        }
    },
    //弄一条鱼 到 画布
    getFishToCanvas(lineID){
        let fishData = glGame.FList[glGame.currGIndex].fishLine[lineID];
        if(fishData == null){
            glGame.editor.status("找不到 "+lineID+" 鱼线");
            return;
        }
        //绘画 贝塞尔点 以及曲线
        glGame.drawBezier.clearCurrFishLine();
        glGame.drawBezier.initDataFormFishPointList(fishData);
    },
    //更新鱼组
    updateGroupToCanteinerAndFishLineToCanvas(rmID = null,nouopdate = false){
        let GContent = this.node.getChildByName("fishGroupCanteiner").getChildByName("fishGroupScrollView").getChildByName("view").getChildByName("content");
        if(rmID){
            let it = GContent.getChildByName("Group_"+rmID);
            GContent.height -= it.height - 2;
            it.destroy();
            return;
        }
        GContent.removeAllChildren(true);
        GContent.height = 0;
        let GItem = this.node.getChildByName("fishGroupCanteiner").getChildByName("GroupItem");
        let groupListData;
        let searcLen = 0;
        if(glGame.SearchFList != undefined){
            for(let key in glGame.SearchFList){
                searcLen++;
                break;
            }
        }
        if(searcLen > 0){
            groupListData = glGame.SearchFList;
        }else{
            groupListData = glGame.FList;
        }
        let groupCoint = 0;
        for(let key in groupListData){
            groupCoint++
            let group = groupListData[key];
            let item = cc.instantiate(GItem);
            item.active = true;
            item.groupData = group;
            item.groupID = key;
            item.name = "Group_"+key;
            GContent.height += item.height + 2;
            item.getChildByName("lab_name").getComponent(cc.Label).string = ""+key;
            if(key == glGame.currGIndex){
                glGame.currGItem = item;
                item.getChildByName("heightLine").active = true;
            }
            GContent.addChild(item);
        }
        if(nouopdate){
            return;
        }
        if(groupCoint > 0)this.updateFishLineToCanvas();
    },
    //显示创建鱼组界面 - 编辑数据
    showCreatorFishGroupView(){
        if(!glGame.atlasList){
            glGame.editor.alert("请选择 图集路径 后再创建鱼组！")
            return;
        }
        if(!glGame.fishTable){
            glGame.editor.alert("请导入 鱼表 后再创建鱼组！")
            return;
        }
        let fishGoulpInfomation = this.node.getChildByName("fishGoulpInfomation");
        fishGoulpInfomation.active = !fishGoulpInfomation.active;
        if(glGame.isCreator){//创建
            fishGoulpInfomation.getChildByName("titleBg").getChildByName("lab_group").getComponent(cc.Label).string = "鱼组创建";
            fishGoulpInfomation.getChildByName("mask").active = false;
            let newGroupID = glGame.currGIndex;
            while (true){
                if(glGame.FList[newGroupID] == null){
                    break;
                }
                newGroupID ++;
            }
            glGame.tmpAddGroupInfoCgi = newGroupID;
            fishGoulpInfomation.getChildByName("groupid_editbox").getComponent(cc.EditBox).string = glGame.tmpAddGroupInfoCgi+"";
            glGame.editor.status("请填写鱼组信息！");
        }else{//编辑
            fishGoulpInfomation.getChildByName("titleBg").getChildByName("lab_group").getComponent(cc.Label).string = "鱼组编辑";
            fishGoulpInfomation.getChildByName("mask").active = true;
            let info = glGame.FList[glGame.tmpGroupId];
            fishGoulpInfomation.getChildByName("groupid_editbox").getComponent(cc.EditBox).string = glGame.tmpGroupId+"";
            fishGoulpInfomation.getChildByName("desc_editbox").getComponent(cc.EditBox).string = (info.desc ? info.desc : "" )+ "";
            fishGoulpInfomation.getChildByName("range_editbox").getComponent(cc.EditBox).string = info.range+"";
            fishGoulpInfomation.getChildByName("type_editbox").getComponent(cc.EditBox).string  = info.type;
        }
    },
    //创建鱼组 确定 - 保存数据
    creatFishGroupSubmit(){
        let fishGoulpInfomation = this.node.getChildByName("fishGoulpInfomation");
        let desc_editbox  = fishGoulpInfomation.getChildByName("desc_editbox").getComponent(cc.EditBox).string;
        let type_editbox  = Number(fishGoulpInfomation.getChildByName("type_editbox").getComponent(cc.EditBox).string);
        let range_editbox = Number(fishGoulpInfomation.getChildByName("range_editbox").getComponent(cc.EditBox).string);
        if(glGame.isCreator){
            //创建模式
            glGame.tmpAddGroupInfoCgi = Number(fishGoulpInfomation.getChildByName("groupid_editbox").getComponent(cc.EditBox).string);
            glGame.FList[glGame.tmpAddGroupInfoCgi] = {
                id:glGame.tmpAddGroupInfoCgi,
                fishLine:{},
                type:type_editbox,
                range:range_editbox,
                desc:desc_editbox
            };
            glGame.currGIndex = glGame.tmpAddGroupInfoCgi;
            if(glGame.currentFish){ //清理 画布
                glGame.currentFish.getComponent("fish_Unit").dispose();
            }
            glGame.drawBezier.clearCurrFishLine();
            glGame.currentFish = null;
            glGame.editor.updateGroupToCanteinerAndFishLineToCanvas();
        }else{
            //编辑模式
            glGame.FList[glGame.tmpGroupId].desc = desc_editbox;
            glGame.FList[glGame.tmpGroupId].type = type_editbox;
            glGame.FList[glGame.tmpGroupId].range = range_editbox;
        }
        fishGoulpInfomation.active = false;
        glGame.isCreator = true;
    },
    //状态栏消息模块
    status(msg,color = null){
        this.node.getChildByName("lab_status").color  = color ? color :  glGame.Color.HAFEBCAK;
        this.node.getChildByName("lab_status").getComponent(cc.Label).string =  "状态栏: "+ msg;
    },
    //简单封装了一个 alert 弹出框
    alert(msg,cb){
        let alert = cc.instantiate(glGame.editor.node.getChildByName("alertView"));
        alert.parent = this.node;
        alert.active = true;
        alert.getChildByName("lab_context").getComponent(cc.Label).string = msg;
        alert.getChildByName("btn_readLastData_ok").on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            event.stopPropagation();
            event.currentTarget.parent.destroy();
            if(cb)cb(true);
        });
        alert.getChildByName("btn_readLastData_canel").on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            event.stopPropagation();
            event.currentTarget.parent.destroy();
            if(cb)cb(false);
        });
        alert.getChildByName("btn_readLastData_no").on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            event.stopPropagation();
            event.currentTarget.parent.destroy();
            if(cb)cb(false);
        });
    },
    //获取复制鱼线的复制数量偏移量 ， type 0 鱼线 1 鱼组
    getCopuLineNumOffSet(type){
        let x,y,xEditbox_str,yEditbox_str;
        if(type == 0){//去鱼线 复制选项 获取 基础偏移量
            let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
            xEditbox_str = optionCopyLine.getChildByName("bg").getChildByName("toggleContainer").getChildByName("optionCopyLineToggle3").getChildByName("Xeditbox").getComponent(cc.EditBox).string;
            yEditbox_str = optionCopyLine.getChildByName("bg").getChildByName("toggleContainer").getChildByName("optionCopyLineToggle3").getChildByName("Yeditbox").getComponent(cc.EditBox).string;
        }else{//去鱼组复制 选项 获取 基础偏移量

        }
        if(xEditbox_str == null || xEditbox_str == undefined || xEditbox_str == ""){
            x = 0;
        }else{
            x = Number(xEditbox_str);
        }
        if(yEditbox_str == null || yEditbox_str == undefined || yEditbox_str == ""){
            y = 0;
        }else {
            y = Number(yEditbox_str);
        }
        return {x:x,y:y};
    },
    //获取复制鱼线的出现时间偏移量 ， type 0 鱼线 1 鱼组
    getCopyLineTimeOffSet(type) {
        let time_str;
        if (type == 0) {//去鱼线 复制选项 获取 基础偏移量
            let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
            time_str = optionCopyLine.getChildByName("bg").getChildByName("timeEditbox").getComponent(cc.EditBox).string;
        } else {//去鱼组复制 选项 获取 基础偏移量

        }
        return time_str == "" ? 0 : Number(time_str);
    },
    //获取复制鱼线的fishTypeId
    getCopyLinefishTypeId() {
        let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
        return optionCopyLine.getChildByName("bg").getChildByName("fishTypeIdEditbox").getComponent(cc.EditBox).string;
    },
    //清除拷贝鱼线界面的上一次参数
    clearcopyFishLineArg(){
        let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
        optionCopyLine.getChildByName("bg").getChildByName("lineIDEditbox").getComponent(cc.EditBox).string = "";
        optionCopyLine.getChildByName("bg").getChildByName("numberEditbox").getComponent(cc.EditBox).string = "";
        optionCopyLine.getChildByName("bg").getChildByName("fishTypeIdEditbox").getComponent(cc.EditBox).string = "";
        optionCopyLine.getChildByName("bg").getChildByName("timeEditbox").getComponent(cc.EditBox).string = "";
        optionCopyLine.getChildByName("bg").getChildByName("toggleContainer").getChildByName("optionCopyLineToggle3").getChildByName("Xeditbox").getComponent(cc.EditBox).string = "";
        optionCopyLine.getChildByName("bg").getChildByName("toggleContainer").getChildByName("optionCopyLineToggle3").getChildByName("Yeditbox").getComponent(cc.EditBox).string = "";
        optionCopyLine.getChildByName("bg").getChildByName("toggleContainer").getChildByName("optionCopyLineToggle4").getComponent(cc.Toggle).isChecked = true;
    },
    //从某个组拷贝某条线到某个组
    copyFishLineToGroup(formGroupID,toGroupID,copyFishID,type,num,timeOffset,rX,rY){
        let offSetX,offSetY;
        if(type == 3){
            let info = this.getCopuLineNumOffSet(0);
            offSetX = info.x;
            offSetY = info.y;
        }
        for (let i=0;i<num;i++){
            let len = 0;
            let newFishID = Number(copyFishID)+len;
            while (true){//出栈式查找id 没有用过的，
                if(glGame.FList[toGroupID].fishLine[newFishID] == null){
                    break;
                }
                len ++;
                newFishID = Number(copyFishID)+len;
            }
            let copyItem = glGame.FList[formGroupID].fishLine[copyFishID];
            if(!glGame.FList[toGroupID].fishLine){
                glGame.FList[toGroupID].fishLine = {};
            }
            glGame.FList[toGroupID].fishLine[newFishID] = JSON.parse(JSON.stringify(copyItem));
            glGame.FList[toGroupID].fishLine[newFishID].lineID = newFishID;
            glGame.FList[toGroupID].fishLine[newFishID].groupID = toGroupID;
            let time = glGame.FList[toGroupID].fishLine[newFishID].showTime;
            if(!time)time = 0;
            if(!timeOffset)timeOffset = 0;
            let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
            let lineID = optionCopyLine.getChildByName("bg").getChildByName("lineIDEditbox").getComponent(cc.EditBox).string;
            if(lineID == "" || lineID == undefined || lineID == null){

            }else{
                glGame.FList[toGroupID].fishLine[newFishID].lineID = Number(lineID);
            }
            let fishTypeId = optionCopyLine.getChildByName("bg").getChildByName("fishTypeIdEditbox").getComponent(cc.EditBox).string;
            if(fishTypeId == "" || fishTypeId == undefined || fishTypeId == null){

            }else{
                glGame.FList[toGroupID].fishLine[newFishID].fishTypeId = Number(fishTypeId);
                let baseFishInfo = glGame.editor.getFishResConfig(Number(fishTypeId));
                glGame.FList[toGroupID].fishLine[newFishID].resGroupId = baseFishInfo.resGroupId;
            }
            glGame.FList[toGroupID].fishLine[newFishID].showTime = time + (i*timeOffset + timeOffset);
            if(rX == 1){//X 坐标反向
                this.setPostReverseWay(toGroupID,newFishID,-1,1);
            }
            if(rY == 1){//Y 坐标反向
                this.setPostReverseWay(toGroupID,newFishID,1,-1);
            }
            if(type == 2){//开始终点交换
                this.startPointChangeEndPoint(toGroupID,newFishID);
            }else if(type == 3){//偏移量 xy
                let x = i * offSetX + offSetX;
                let y = i * offSetY + offSetY;
                this.setPostOffsexXY(toGroupID,null,x,y);
            }else if(type == 4){//直接拷贝

            }
        }
        this.updateFishLineToCanvas(null,null,true);//更新
        this.clearcopyFishLineArg();
    },
    //复制鱼线
    copyFishLineToLine(formGroupID,copyFishID,type,num,timeOffset,fishTypeId,rX,rY){
        let offSetX,offSetY;
        if(type == 3){
            let info = this.getCopuLineNumOffSet(0);
            offSetX = info.x;
            offSetY = info.y;
        }
        for (let i=0;i<num;i++){
            let len = 0;
            let toGroupID = formGroupID;
            let newLineID = Number(copyFishID)+len;
            while (true){//出栈式查找id 没有用过的，
                if(glGame.FList[toGroupID].fishLine[newLineID] == null && newLineID != glGame.lineID){
                    break;
                }
                len ++;
                newLineID = Number(copyFishID)+len;
            }
            let copyItem = glGame.FList[formGroupID].fishLine[copyFishID];
            glGame.FList[toGroupID].fishLine[newLineID] = JSON.parse(JSON.stringify(copyItem));
            glGame.FList[toGroupID].fishLine[newLineID].lineID = newLineID;
            glGame.FList[toGroupID].fishLine[newLineID].groupID = toGroupID;
            let time = glGame.FList[toGroupID].fishLine[newLineID].showTime;
            if(!time)time = 0;
            if(!timeOffset)timeOffset = 0;
            glGame.FList[toGroupID].fishLine[newLineID].showTime = time + (i*timeOffset + timeOffset);
            if(fishTypeId != null && fishTypeId != "" && !isNaN(Number(fishTypeId))){
                glGame.FList[toGroupID].fishLine[newLineID].fishTypeId = fishTypeId;
                let baseFishInfo = glGame.editor.getFishResConfig(Number(fishTypeId));
                glGame.FList[toGroupID].fishLine[newLineID].resGroupId = baseFishInfo.resGroupId;
            }
            let optionCopyLine = glGame.editor.node.getChildByName("chooseFishingLine").getChildByName("bg").getChildByName("btn_copyLineOption").getChildByName("optionCopyLine");
            let lineID = optionCopyLine.getChildByName("bg").getChildByName("lineIDEditbox").getComponent(cc.EditBox).string;
            if(lineID == "" || lineID == undefined || lineID == null){

            }else{
                glGame.FList[toGroupID].fishLine[newLineID].lineID = Number(lineID);
            }
            if(rX == 1){//X 坐标反向
                this.setPostReverseWay(toGroupID,newLineID,-1,1);
            }
            if(rY == 1){//Y 坐标反向
                this.setPostReverseWay(toGroupID,newLineID,1,-1);
            }
            if(type == 2){//开始终点交换
                this.startPointChangeEndPoint(toGroupID,newLineID);
            }else if(type == 3){//偏移量 x y
                let x = i * offSetX + offSetX;
                let y = i * offSetY + offSetY;
                this.setPostOffsexXY(toGroupID,newLineID,x,y);
            }else if(type == 4){//直接复制

            }
        }
        this.updateFishLineToCanvas(null,null,true);//更新
        this.clearcopyFishLineArg();
    },
    //复制鱼组
    copyGroupToGroup(type){
        if(type == 3){
            let info = this.getCopuLineNumOffSet(1);
            offSetX = info.x;
            offSetY = info.y;
        }
        let offSetX,offSetY;
        let len = 0;
        let newGroupID = glGame.startGroupIndex+len;
        while (true){
            if(glGame.FList[newGroupID] == null){
                break;
            }
            len ++;
            newGroupID = glGame.startGroupIndex+len;
        }
        let copyItem = glGame.FList[glGame.tmpGroupId];
        glGame.FList[newGroupID] = JSON.parse(JSON.stringify(copyItem));
        glGame.FList[newGroupID].id = newGroupID;

        for (let k in glGame.FList[newGroupID].fishLine){
            glGame.FList[newGroupID].fishLine[k].groupID = newGroupID;
        }
        if(type == 0){//X 坐标反向
            this.setPostReverseWay(newGroupID,null,-1,1);
        }else if(type == 1){//Y 坐标反向
            this.setPostReverseWay(newGroupID,null,1,-1);
        }else if(type == 2){//开始终点交换
            this.startPointChangeEndPoint(newGroupID,null);
        }else if(type == 3){//偏移量 xy
            let x = i * offSetX + offSetX;
            let y = i * offSetY + offSetY;
            this.setPostOffsexXY(newGroupID,null,x,y);
        }
        this.updateGroupToCanteinerAndFishLineToCanvas();//更新
    },
    //坐标反向
    setPostReverseWay(groupID,fishID,x,y){
        if(fishID){
            for (let i=0; i<glGame.FList[groupID].fishLine[fishID].posArray.length;i++){
                if(x == -1){
                    glGame.FList[groupID].fishLine[fishID].posArray[i].x = -glGame.FList[groupID].fishLine[fishID].posArray[i].x;
                }
                if(y == -1){
                    glGame.FList[groupID].fishLine[fishID].posArray[i].y = -glGame.FList[groupID].fishLine[fishID].posArray[i].y;
                }
            }
        }else{
            for (let id in glGame.FList[groupID].fishLine){
                for (let i=0; i<glGame.FList[groupID].fishLine[id].posArray.length;i++){
                    if(x == -1){
                        glGame.FList[groupID].fishLine[id].posArray[i].x = -glGame.FList[groupID].fishLine[id].posArray[i].x;
                    }
                    if(y == -1){
                        glGame.FList[groupID].fishLine[id].posArray[i].y = -glGame.FList[groupID].fishLine[id].posArray[i].y;
                    }
                }
            }
        }
    },
    //坐标偏移量
    setPostOffsexXY(groupID,fishID,x,y){
        if(fishID){
            for (let i=0; i<glGame.FList[groupID].fishLine[fishID].posArray.length;i++){
                glGame.FList[groupID].fishLine[fishID].posArray[i].x += x;
                glGame.FList[groupID].fishLine[fishID].posArray[i].y += y;
            }
        }else{
            for (let id in glGame.FList[groupID].fishLine){
                for (let i=0; i<glGame.FList[groupID].fishLine[id].posArray.length;i++){
                    glGame.FList[groupID].fishLine[id].posArray[i].x += x;
                    glGame.FList[groupID].fishLine[id].posArray[i].y += y;
                }
            }
        }
    },
    //开始终点交换
    startPointChangeEndPoint(groupID,fishID){
        if(fishID){
            let newPosArray = [];
            for (let i=glGame.FList[groupID].fishLine[fishID].posArray.length-1; i>-1;i--){
                newPosArray.push(glGame.FList[groupID].fishLine[fishID].posArray[i]);
            }
            glGame.FList[groupID].fishLine[fishID].posArray = newPosArray;
        }else{
            for (let id in glGame.FList[groupID].fishLine){
                let newPosArray = [];
                for (let i=glGame.FList[groupID].fishLine[id].posArray.length-1; i>-1;i--){
                    newPosArray.push(glGame.FList[groupID].fishLine[id].posArray[i]);
                }
                glGame.FList[groupID].fishLine[id].posArray = newPosArray;
            }
        }
    },
    //显示 隐藏鱼
    hideOrShowFish(active){
        if(glGame.GFishList.length > 0){
            let len = glGame.GFishList.length;
            for (let i = 0;i<len;i++){
                let fish = glGame.GFishList[i];
                fish.active = active;
            }
        }
    },
    //显示 隐藏鱼
    hideOrShowFish2(){
        if(glGame.GFishList.length > 0){
            let len = glGame.GFishList.length;
            for (let i = 0;i<len;i++){
                let fish = glGame.GFishList[i];
                fish.active = !fish.active;
            }
        }
    },
    //导入Json
    importJson(tmpList){
        if(!tmpList){
            glGame.editor.status("导入失败，文件损坏");
            return
        }
        if(!glGame.currGIndex){
            for (let ind in tmpList){
                glGame.currGIndex = ind;
                break;
            }
        }
        if(!glGame.FList){
            glGame.FList = tmpList;
        }else{
            let isNoRep = true;
            let msg = "导入 "
            for (let ind in tmpList){
                if(glGame.FList[ind]){//不覆盖导入
                    let len = 1;
                    let newGroupID = glGame.startGroupIndex+len;
                    while (true){//出栈式查找id 没有用过的，
                        if(glGame.FList[newGroupID] == null){
                            break;
                        }
                        len ++;
                        newGroupID = glGame.startGroupIndex+len;
                    }
                    msg+="鱼组："+ind+"重复，更换为:"+newGroupID;
                    glGame.FList[newGroupID] = tmpList[ind];
                    isNoRep = false;
                }else{
                    glGame.FList[ind] = tmpList[ind];
                    glGame.editor.status("导入成功，无重复鱼组！");
                }
            }
            if(isNoRep)glGame.editor.status(msg);
        }
        glGame.isImport = true;
        let count = 0;
        let list;
        for (let groupIndex in glGame.FList){
            glGame.currGIndex = groupIndex;
            list = glGame.FList[glGame.currGIndex].fishLine;
            for (let k in list){
                if(list[k].frequency == undefined){//兼容老数据
                    list[k].frequency = glGame.runSpeed;
                }
                if(list[k].fishTypeId == undefined){//兼容老数据
                    list[k].fishTypeId = "";
                }
            }
            count++;
        }
        if(list){
            for (let fishID in list){
                glGame.currLineItem = list[fishID];
                glGame.editor.updateGroupToCanteinerAndFishLineToCanvas();
                break;
            }
        }else if(count>0){
            glGame.editor.updateGroupToCanteinerAndFishLineToCanvas();
        }
        glGame.editor.status("导入成功");
    },
    //资源编辑 arg = 1 已编辑过，直接显示， 0 无数据，新的开始
    showResEditView(arg){
        //该功能暂停
    },
});