//鱼线item
cc.Class({
    extends: cc.Component,
    properties: {
        type : 0,// 1 组 item ， 2资源item ，3 线
    },
    start () {
        let lab_desc_id = glGame.editor.node.getChildByName("tips").getChildByName("layout").getChildByName("lab_desc_id");
        let lab_id = glGame.editor.node.getChildByName("tips").getChildByName("layout").getChildByName("lab_id");
        this.node.on(cc.Node.EventType.MOUSE_ENTER, (event) => {
            if(this.type == 1){
                this.node.getChildByName("moveHeight").active = true;
                glGame.editor.node.getChildByName("tips").active = true;
                lab_id.active  = true;
                let info = glGame.FList[this.node.groupID];
                lab_desc_id.getComponent(cc.Label).string = "鱼组ID";
                lab_id.getComponent(cc.Label).string = Number(this.node.groupID)+"";
                glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_d").getComponent(cc.Label).string = info ? info.desc+"" : "";
                glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_d").active = true;
                glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_desc").active = true;
                glGame.editor.node.getChildByName("tips").getChildByName("bg").height = 150;
                glGame.editor.node.getChildByName("tips").getChildByName("bg").width = 300;
            }
            if(this.type == 3){
                this.node.getChildByName("moveHeight").active = true;
                glGame.editor.node.getChildByName("tips").active = true;
                lab_id.active  = true;
                let info = glGame.FList[glGame.currGIndex].fishLine[Number(this.node.lineID)];
                lab_id.getComponent(cc.Label).string = Number(this.node.lineID)+"";
                let fishName = "找不到配置 "+info.lineID;
                if(info != null && glGame.fishTable[Number(info.fishTypeId)]){
                    fishName = glGame.fishTable[Number(info.fishTypeId)].fishName;
                }else{
                    if(glGame.fishTable[this.node.fishTypeId] != null){
                        fishName = glGame.fishTable[this.node.fishTypeId].fishName;
                    }else{
                        cc.error(" 找不到配置,请检查鱼表配置 info : ",info,"     fishTable     ",glGame.fishTable);
                    }
                }
                lab_desc_id.getComponent(cc.Label).string = fishName+"";
                glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_d").getComponent(cc.Label).string = (info ? info.desc+"" : "")+"";
                glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_d").active = true;
                glGame.editor.node.getChildByName("tips").getChildByName("layout2").getChildByName("lab_desc").active = true;
                glGame.editor.node.getChildByName("tips").getChildByName("bg").height = 150;
                glGame.editor.node.getChildByName("tips").getChildByName("bg").width = 300;
            }
        }, this.node);

        this.node.on(cc.Node.EventType.MOUSE_MOVE, (event) => {
            let pos  = glGame.editor.node.convertToNodeSpaceAR(event.getLocation());
            if(this.type == 1){
                pos.x = pos.x+glGame.editor.node.getChildByName("tips").width + 10;
                glGame.editor.node.getChildByName("tips").setPosition(pos);
            }
            if(this.type == 3){
                pos.x -= 10;
                glGame.editor.node.getChildByName("tips").setPosition(pos);
            }
        }, this.node);

        this.node.on(cc.Node.EventType.MOUSE_LEAVE, (event) => {
            this.node.getChildByName("moveHeight").active = false;
            glGame.editor.node.getChildByName("tips").active = false;
        }, this.node);
    },
});
