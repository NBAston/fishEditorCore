//设置面板
cc.Class({
    extends: cc.Component,
    start () {
        let speed_editbox = this.node.getChildByName("layourt").getChildByName("speed_editbox");
        let runSpeed_editbox = this.node.getChildByName("layourt").getChildByName("runSpeed_editbox");
        let fishID_editbox = this.node.getChildByName("layourt").getChildByName("fishID_editbox");
        let groupID_editbox = this.node.getChildByName("layourt").getChildByName("groupID_editbox");
        speed_editbox.getComponent(cc.EditBox).string = glGame.speed;
        fishID_editbox.getComponent(cc.EditBox).string = glGame.lineID;
        groupID_editbox.getComponent(cc.EditBox).string = glGame.startGroupIndex;

        speed_editbox.on("text-changed", (editbox) => {
            glGame.speed = Number(editbox.string);
        })
        runSpeed_editbox.on("text-changed", (editbox) => {
            glGame.runSpeed = Number(editbox.string);
        })
        fishID_editbox.on("text-changed", (editbox) => {
            glGame.lineID = Number(editbox.string);
        })
        groupID_editbox.on("text-changed", (editbox) => {
            glGame.startGroupIndex = Number(editbox.string);
        })
        let len = 0;
        let len2 = 0;
        for (let key in glGame.FList){
            len ++;
            let groupList = glGame.FList[key];
            for (let key in groupList.fishLine){
                len2++;
            }
        }
        this.node.getChildByName("lab_info1").getComponent(cc.Label).string = "当前鱼组数量："+len;
        this.node.getChildByName("lab_info2").getComponent(cc.Label).string = "当前总鱼线："+len2;
    },
    closeView(){
        this.node.active = false;
    },
});
