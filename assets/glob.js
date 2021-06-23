//单例管理器
var glGame = {};
window.glGame = glGame;
glGame.filePreFix = "fish"; //图集名字前缀
glGame.drawStart = false;   //是否已初始化绘画
glGame.isImport = false;    //是否是导入

glGame.scale = 1;           //默认值全局scale，该值不会导出,仅限捕鱼编辑器使用
glGame.runSpeed = 1;        //0.13默认值在鱼表这里是改变默认值的默认偏移量  鱼图播放/每帧速度
glGame.speed = 5;           //默认值全局速度
glGame.maxSpeed = 30;       //默认值 每个贝塞尔点的全局速度
glGame.lineID = 1000;       //鱼线id - 每添加一条鱼++
glGame.level = 10;          //鱼线默认层级
glGame.showTime = 0;        //默认值出现时间

glGame.startPoint = cc.v2(-1122, 300);   //创建鱼的第一条 贝塞尔 线 开始点
glGame.controlPoint = cc.v2(57, 290);    //创建鱼的第一条 贝塞尔 线 控制点
glGame.endPoint = cc.v2(1207, 300);      //创建鱼的第一条 贝塞尔 线 结束点

glGame.FishRunGap = 2;      //鱼游 时长 间隙值，经过测试无误

glGame.P13 = [
    [cc.v2(-1122,303),cc.v2(-57,290),cc.v2(1207,283)],
    [cc.v2(-1122,159),cc.v2(50,161),cc.v2(1207,169)],
    [cc.v2(-1122,-212),cc.v2(61,-247),cc.v2(1207,-261)],
    [cc.v2(-1122,-251),cc.v2(-133,-121),cc.v2(1207,-123)],
    [cc.v2(1207,523),cc.v2(388,-208),cc.v2(-1150,-206)],
    [cc.v2(1207,-474),cc.v2(-398,-348),cc.v2(20,696)],
    [cc.v2(-1122,-529),cc.v2(155,-194),cc.v2(20,696)],
    [cc.v2(-1122,681),cc.v2(38,-457),cc.v2(1207,684)],
    [cc.v2(-1122,681),cc.v2(-11,-684),cc.v2(1207,-649)],
    [cc.v2(-1122,544),cc.v2(897,-2),cc.v2(-1161,-556)],
    [cc.v2(1207,552),cc.v2(-1076,33),cc.v2(1272,-560)],
    [cc.v2(28,1207),cc.v2(-7,-2),cc.v2(15,-626)],
    [cc.v2(-1122,-640),cc.v2(18,12),cc.v2(1224,634)],
];


glGame.FList                    = {};    //鱼组 保存当前所有的鱼线
glGame.startGroupIndex          = 100000;//鱼组开始id
glGame.currGIndex               = 100000;//当前鱼组id

glGame.width  = 3600;                    //可绘画区域宽度
glGame.height = 2200;                    //可绘画区域高度


glGame.Color = {}
glGame.Color.RED = cc.color(246,92,92);         //TPIS 颜色提示  红色
glGame.Color.HAFEBCAK = cc.Color(156,156,156);  //TIPS 颜色提示  灰色

//--------------------------------------------------------公共方法-------------------------------------------------------
glGame.erxiangshi = function(start, end)
{
    let cs = 1, bcs= 1;
    while (end > 0) {
        cs *= start;
        bcs *= end;
        start--;
        end--;
    }
    return (cs / bcs);
}
glGame.MultiPointBezier = function(points, t) {
    let len = points.length;
    let x = 0, y = 0;
    for (let i = 0; i < len; i++) {
        let point = points[i];
        x += point.x * Math.pow((1 - t), (len - 1 - i)) * Math.pow(t, i) * (glGame.erxiangshi(len - 1, i));
        y += point.y * Math.pow((1 - t), (len - 1 - i)) * Math.pow(t, i) * (glGame.erxiangshi(len - 1, i));
    }
    return { x: x, y: y };
}
glGame.CreateBezierPoints = function(anchorpoints, pointsAmount,points) {
    // var points = [];
    for (var i = 0; i < pointsAmount; i++) {
        var point = glGame.MultiPointBezier(anchorpoints, i / pointsAmount);
        points.push(point);
    }
    return points;
}
glGame.getPOst = function (v){
    return {x:Number(v.x.toFixed(1)),y:Number(v.y.toFixed(1))}
}
glGame.getPosArrayAndmoveList = function (path,lineID,rate)
{
    let posArray = [];
    let moveList = [];
    for (let i = 0; i < path.length; i++) {
        let pos = glGame.getPostFormPath(path,i);
        posArray.push(glGame.getPOst(pos.startPos));
        posArray.push(glGame.getPOst(pos.controlPos));
        posArray.push(glGame.getPOst(pos.endPos));
        let speed1 = path[i]["start"]["speed"] == undefined ? rate : Number(path[i]["start"]["speed"]);
        let speed3 = path[i]["end"]["speed"] == undefined ? rate : Number(path[i]["end"]["speed"]);
        if(i == 0){
            moveList.push(speed1);//如果找不到当前线的速度就 使用默认值
            moveList.push(0);//如果找不到当前线的速度就 使用默认值
            moveList.push(0);//如果找不到当前线的速度就 使用默认值
        }else{
            moveList.push(speed1);//如果找不到当前线的速度就 使用默认值
            moveList.push(0);//如果找不到当前线的速度就 使用默认值
            moveList.push(speed3);//如果找不到当前线的速度就 使用默认值
        }
    }
    return {posArray:posArray,moveList:moveList};
}
glGame.getPostFormPath = function(path,i){
    let startPos,controlPos,endPos;
    if(!path[i]["start"]){
        startPos    = cc.v2(Number(path[0].x.toFixed(1)),Number(path[0].y.toFixed(1)));
        controlPos  = cc.v2(Number(path[1].x.toFixed(1)),Number(path[1].y.toFixed(1)));
        endPos      = cc.v2(Number(path[2].x.toFixed(1)),Number(path[2].y.toFixed(1)));
    }else{
        startPos = cc.v2(
            path[i]["start"].x,
            path[i]["start"].y
        )
        controlPos = cc.v2(
            path[i]["control"].x,
            path[i]["control"].y
        )
        endPos = cc.v2(
            path[i]["end"].x,
            path[i]["end"].y
        )
    }
    return {startPos:startPos,controlPos:controlPos,endPos:endPos}
}
glGame.calcBezierLength = function(list, t)
{
    let pt0 = list[0], pt1 = list[1], pt2 = list[2];
    var ax = pt0.x - 2 * pt1.x + pt2.x;
    var ay = pt0.y - 2 * pt1.y + pt2.y;
    var bx = 2 * pt1.x - 2 * pt0.x;
    var by = 2 * pt1.y - 2 * pt0.y;

    var A = 4 * (ax * ax + ay * ay);
    var B = 4 * (ax * bx + ay * by);
    var C = bx * bx + by * by;

    var temp1 = Math.sqrt(C + t * (B + A * t));
    var temp2 = (2 * A * t * temp1 + B * (temp1 - Math.sqrt(C)));
    var temp3 = Math.log(B + 2 * Math.sqrt(A) * Math.sqrt(C));
    var temp4 = Math.log(B + 2 * A * t + 2 * Math.sqrt(A) * temp1);
    var temp5 = 2 * Math.sqrt(A) * temp2;
    var temp6 = (B * B - 4 * A * C) * (temp3 - temp4);
    return (temp5 + temp6) / (8 * Math.pow(A, 1.5));
}
//获取时间下标
glGame.getMaxIndexByTime = function(posArray,moveList) {
    let timeIndex = 0;
    let startTime = 0;
    let nowTime = 0;
    while (true){
        timeIndex = glGame.runTime(startTime,moveList);
        if(timeIndex == -1){
            break;
        }
        let i = timeIndex > 0 ?  3 * timeIndex : 2 * timeIndex;
        let a = posArray[i];
        if(!a){//拿不到数据，到尽头了，销毁
            break;
        }
        startTime = startTime + 0.017;
        nowTime+=0.017;
    }
    return Number(nowTime.toFixed(2));
}
//获取运行时间
glGame.runTime = function(existTime,moveList) {
    let time = 0
    for (let i = 0; i < moveList.length / 2; i++) {
        let one = 2 * i;
        let two = 2 * i + 1;
        time = time + moveList[one] + moveList[two];
        if (time >= existTime) {
            return i;
        }
    }
    return -1
}
//范围计算
glGame.range = function(timeListTmp,t){
    if(timeListTmp.length == 0){
        return true;
    }
    if(timeListTmp.indexOf(t) != -1){
        return false;
    }
    for (let i=0;i<timeListTmp.length;i++){
        if(Math.abs(Math.abs(timeListTmp[i]) - Math.abs(t)) < glGame.FishRunGap){
            return false;
        }
    }
    return true;
}
//获取边缘点时间
glGame.edgeComputingToTime = function(posArray,moveList,runTime,showTime){
    let time = 0;                   //模拟帧数运行 当前时间
    let timeList = [];              // [[进时间,出时间], ... ]   的 数据 格式
    let oldTimeList = [];           // [[方向，时间], ... ]     的 数据 格式
    let timeListTmp = [];           //辅助 timeList 生成的 临时数组
    let actionListTmp = [];         //辅助 timeList 生成的 临时数组
    let lenTime = Number(runTime);  //游行时间 + showTime  = 总生命（出生到死亡最大时间，包含屏幕边缘内外游行以及等待游行时间）
    let frequency = 0.001;          //每帧运行时间的颗粒度
    while (time < lenTime){         //模拟 游行
        let pos = glGame.getPosFormTime(time,posArray,moveList);//获得当前 time 的 位置
        if(pos == undefined){   //获取不到就结束
            // cc.log("数据忽略.....time ",time);
            break;
        }
        let arraid_1920_1080 = Math.floor(Math.abs(pos.x)) == 960 || Math.floor(Math.abs(pos.y)) == 540;//x到达1920/2(960) 或 y 到达 1080/2(540)
        if(arraid_1920_1080){//到达x 或 y 边缘的时候 则需记录
            let t = Number(time.toFixed(0));
            let t2 = Number(time.toFixed(2));
            if(glGame.range(timeListTmp,t)){//如果是合适的范围才使用
                if(actionListTmp.length == 0){
                    let frist = glGame.getArea(glGame.getPosFormTime(0,posArray,moveList));
                    actionListTmp.push(frist);
                    let tmpTime1 = Number((showTime+t2).toFixed(2));
                    // timeList.push({e:frist==1?0:1,t:tmpTime1});
                    oldTimeList.push([frist==1?0:1,tmpTime1]);
                    timeList.push([tmpTime1]);
                }else{
                    let e = actionListTmp[actionListTmp.length-1] == 1 ? 0 : 1;
                    let tmpTime2 = Number((showTime+t2).toFixed(2));
                    // timeList.push({e:e==1?0:1,t:tmpTime2});
                    oldTimeList.push([e==1?0:1,tmpTime2]);
                    if(timeList[timeList.length - 1].length == 1){
                        timeList[timeList.length - 1].push(tmpTime2);
                    }else{
                        timeList.push([tmpTime2]);
                    }
                    actionListTmp.push(e);
                }
                timeListTmp.push(t);
            }
        }
        time += frequency;
    }
    glGame.getPosFormTime_lastIndex = null;
    glGame.getPosFormTime_currTime = null;
    glGame.getPosFormTime_nextTime = null;

    if(oldTimeList.length == 0){//该情况是 鱼一直在屏幕内或屏幕外游，但是在编辑规则里 只允许鱼一直在屏幕内游
        return [[0,lenTime+showTime]];
    } else if(oldTimeList.length == 1){
        if(oldTimeList[0].length == 1){//进
            return [timeListTmp[0],lenTime+showTime];
        }else {                        //出
            return [[0,timeListTmp[0]]];
        }
    }
    // let endoldList = oldTimeList[oldTimeList.length-1];//最后一组数据 如果是单数 那么可能只有一个进 或者一个出 要补全
    let endList = timeList[timeList.length-1];//最后一组数据2 没有方向的
    if(endList.length == 1){
        endList.push(lenTime+showTime); //endList[0][1] 是进来时间
    }
    return timeList
}
//获取是否是在屏幕内 1 是屏幕内 0 是屏幕外
glGame.getArea = function (pos) {
    if((Math.abs(pos.x) < 960) && (Math.abs(pos.y) < 540)){
        return 1;//屏幕内
    }
    return 0;//屏幕外
}
glGame.getPosFormTime_lastIndex = null;
glGame.getPosFormTime_currTime = null;
glGame.getPosFormTime_nextTime = null;
//通过时间获取当前坐标
glGame.getPosFormTime = function (_startTime,posArray,moveList) {
    let timeIndex = glGame.getIndexByTime(_startTime,moveList);
    if (timeIndex == -1) {//到尽头了，销毁
        // cc.warn("run over ")
        return null;
    }
    let t;
    let currTime;
    let nextTime;
    if(glGame.getPosFormTime_lastIndex == null || timeIndex != glGame.getPosFormTime_lastIndex){
        currTime = glGame.getTimeByIndex(timeIndex,moveList);
        nextTime = glGame.getTimeByIndex(timeIndex + 1,moveList);
        glGame.getPosFormTime_currTime = currTime;
        glGame.getPosFormTime_nextTime = nextTime;
    }else
    {
        currTime = glGame.getPosFormTime_currTime;
        nextTime = glGame.getPosFormTime_nextTime;
    }
    let fz = _startTime - currTime;
    let fm = nextTime - currTime;
    t  = fz/fm;
    let i = timeIndex > 0 ?  3 * timeIndex : 2 * timeIndex;
    let a = posArray[i];
    let b = posArray[i + 1];
    let c = posArray[i + 2];
    if(!a){//拿不到数据，到尽头了，销毁
        // cc.warn(">> over 2")
        return null;
    }
    //轨迹运动
    let x = Math.pow(1 - t, 2) * a.x + 2 * t * (1 - t) * b.x + Math.pow(t, 2) * c.x;
    let y = Math.pow(1 - t, 2) * a.y + 2 * t * (1 - t) * b.y + Math.pow(t, 2) * c.y;
    return {x:x,y:y,timeIndex:timeIndex};
}
//获取时间下标
glGame.getIndexByTime = function(existTime,moveList) {
    let time = 0
    for (let i = 0; i < moveList.length / 2; i++) {
        let one = 2 * i;
        let two = 2 * i + 1;
        time = time + moveList[one] + moveList[two];
        if (time >= existTime) {
            return i;
        }
    }
    return -1
}
//通过下标获取时间
glGame.getTimeByIndex = function(index,moveList) {
    let time = 0
    for (let i = 0; i < moveList.length / 2; i++) {
        if (i == index) {
            break
        }
        let one = 2 * i;
        let two = 2 * i + 1;
        time = time + moveList[one] + moveList[two]
    }
    return time
}
//获取图片
glGame.getAtlasForTexture = function(key,imgName){
    if(glGame.atlasList != null && glGame.atlasList[key]){
        let atlasPlist = glGame.atlasList[key].plist;
        let atlasFrame = glGame.atlasList[key].frame;
        if(atlasPlist == null || atlasPlist.frames == null){
            console.error("无法获取图集"+key+",请检查！")
            glGame.editor.status("无法获取图集"+key+",请检查！")
            return null;
        }
        let frameDataObj = atlasPlist.frames[imgName+'.png'];
        if(!frameDataObj){
            return  null;
        }
        // 图片矩形信息
        let rect = glGame.GetFrameData(frameDataObj.frame);
        // 图片的原始大小
        let size = glGame.GetSizeData(frameDataObj.sourceSize);
        // 图片合图时的裁剪偏移
        let offset = glGame.GetOffsetData(frameDataObj.offset);
        // 创建此图的精灵帧
        let newFrame = new cc.SpriteFrame();
        newFrame.setTexture(atlasFrame, rect, frameDataObj.rotated, offset, size);
        return newFrame;
    }
}
glGame.atlasList = null;
glGame.loadingAtlas = function(key,imageUrlStr,cb){
    if(!glGame.atlasList)glGame.atlasList = {};
    cc.loader.load(imageUrlStr+'/'+key+".png",  (error, atlasFrame) => {
        if (error != null || atlasFrame == null) {
            console.log("加载.png文件失败");
            if(error)console.log(error);
            console.log(atlasFrame);
        }
        if(!glGame.atlasList[key])glGame.atlasList[key] = {};
        glGame.atlasList[key].frame = atlasFrame;
        cc.loader.load(imageUrlStr+'/'+key+".plist",  (error2, atlasPlist) => {
            if (error2 != null || atlasPlist == null) {
                console.log("加载.plist文件失败");
            }
            if(error2)console.log(error2);
            glGame.atlasList[key].plist = atlasPlist;
            if(cb) {
                cb();
            }
        });
    });
}
//动态解析图集
glGame.GetFrameData = function (imgName) {
    let str = imgName;
    // 13是这个rect结构至少要有的字符串长度，例如{{1000,389},{1022,768}}
    if (str.length < 13) {
        console.log("---解析plist的frame rect，数据错误-----");
        return null;
    }
    let newStr = str;
    newStr = newStr.slice(2);
    newStr = newStr.slice(0, newStr.length - 2);
    let newList_0 = newStr.split('},{');
    let newList_1 = newList_0[0].split(",");
    let newList_2 = newList_0[1].split(",");
    if (newList_1.length < 2 || newList_2.length < 2) {
        Tools.log("---解析plist的frame rect，字符串数据错误-----");
        return null;
    }
    return cc.rect(parseInt(newList_1[0]), parseInt(newList_1[1]), parseInt(newList_2[0]), parseInt(newList_2[1]));
};
glGame.GetSizeData = function (str) {
    // 5是这个size结构至少要有的字符串长度，例如{64,60}
    if (str.length < 5) {
        console.log("---解析plist的size，数据错误-----");
        return null;
    }
    let newStr = str;
    newStr = newStr.slice(1);
    newStr = newStr.slice(0, newStr.length - 1);
    let newList_0 = newStr.split(',');
    if (newList_0.length < 2) {
        console.log("---解析plist的size，字符串数据错误-----");
        return null;
    }
    return cc.size(parseInt(newList_0[0]), parseInt(newList_0[1]));
};
glGame.GetOffsetData = function (str) {
    // 5是这个offset结构至少要有的字符串长度，例如{22,-24}
    if (str.length < 5) {
        console.log("---解析plist的offset，数据错误-----");
        return null;
    }
    let newStr = str;
    newStr = newStr.slice(1);
    newStr = newStr.slice(0, newStr.length - 1);
    let newList_0 = newStr.split(',');
    if (newList_0.length < 2) {
        console.log("---解析plist的offset，字符串数据错误-----");
        return null;
    }
    return cc.v2(parseInt(newList_0[0]), parseInt(newList_0[1]));
};
//三端导出的配置
glGame.EditOutConfig   = {
    "line": {
        "groupID": "groupID",
        "fishTypeId": "fishTypeId",
        "lineID": "lineID",
        "resGroupId": "resGroupId",
        "showTime": "showTime",
        "frequency": "frequency",
        "rate": "rate",
        "scale": "scale",
        "desc": "desc",
        "runTime": "runTime",
        "posArray": "posArray",
        "moveList": "moveList",
        "edgeList": "edgeList"
    },
    "line_isOut": {
        "groupID": true,
        "fishTypeId": true,
        "lineID": true,
        "resGroupId": true,
        "showTime": true,
        "frequency": true,
        "rate": true,
        "scale": true,
        "desc": true,
        "runTime": true,
        "posArray": true,
        "moveList": true,
        "edgeList": true
    },
    "group": {
        "id": "id",
        "fishLine": "fishLine",
        "type": "type",
        "range": "range",
        "desc": "desc"
    },
    "group_isOut": {
        "id": true,
        "fishLine": true,
        "type": true,
        "range": true,
        "desc": true
    }
};
glGame.ServerOutConfig = {
    "line": {
        "groupID": "groupID",
        "fishTypeId": "fishTypeId",
        "lineID": "lineID",
        "resGroupId": "resGroupId",
        "showTime": "showTime",
        "frequency": "frequency",
        "rate": "rate",
        "scale": "scale",
        "desc": "desc",
        "runTime": "runTime",
        "posArray": "posArray",
        "moveList": "moveList",
        "edgeList": "edgeList"
    },
    "line_isOut": {
        "groupID": false,
        "fishTypeId": true,
        "lineID": false,
        "resGroupId": false,
        "showTime": true,
        "frequency": false,
        "rate": false,
        "scale": false,
        "desc": false,
        "runTime": true,
        "posArray": false,
        "moveList": false,
        "edgeList": true
    },
    "group": {
        "id": "id",
        "fishLine": "fishLine",
        "type": "type",
        "range": "range",
        "desc": "desc"
    },
    "group_isOut": {
        "id": false,
        "fishLine": true,
        "type": true,
        "range": false,
        "desc": false
    }
};
glGame.ClientOutConfig = {
    "line": {
        "groupID": "groupID",
        "fishTypeId": "fishTypeId",
        "lineID": "lineID",
        "resGroupId": "resGroupId",
        "showTime": "showTime",
        "frequency": "frequency",
        "rate": "rate",
        "scale": "scale",
        "desc": "desc",
        "runTime": "runTime",
        "posArray": "posArray",
        "moveList": "moveList",
        "edgeList": "edgeList"
    },
    "line_isOut": {
        "groupID": false,
        "fishTypeId": true,
        "lineID": false,
        "resGroupId": false,
        "showTime": true,
        "frequency": true,
        "rate": true,
        "scale": false,
        "desc": false,
        "runTime": true,
        "posArray": true,
        "moveList": true,
        "edgeList": false
    },
    "group": {
        "id": "id",
        "fishLine": "fishLine",
        "type": "type",
        "range": "range",
        "desc": "desc"
    },
    "group_isOut": {
        "id": false,
        "fishLine": true,
        "type": false,
        "range": false,
        "desc": false
    }
};



//测试鱼表
glGame.fishTableTest = {
    "101": {
        "fishTypeId": "101",
        "fishName": "孔雀鱼",
        "fishDesc": "孔雀鱼，也称为凤尾鱼是一种热带鱼，雌雄鱼的体型和色彩差别较大，体色绚烂多彩、体型优美。孔雀鱼性情温和，能与温和的中小性型热带鱼混养，平时活泼好动，寿命较短。",
        "level": 1,
        "deadEvent": 0,
        "resGroupId": 1,
        "shock": 0,
        "effectRotate": 1,
        "priority": 1,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "102": {
        "fishTypeId": "102",
        "fishName": "凤凰鱼",
        "fishDesc": "凤凰鱼，是一种温和而胆小的热带鱼，适宜放置于比较安静又没有直射光照射的环境中。水箱中应多植水草供其躲藏栖身。它爱吃动物性食物，不挑食，可以和其他小型热带鱼混养。",
        "level": 1,
        "deadEvent": 0,
        "resGroupId": 2,
        "shock": 0,
        "effectRotate": 1,
        "priority": 2,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "103": {
        "fishTypeId": "103",
        "fishName": "天使鱼",
        "fishDesc": "天使鱼，也称神仙鱼，可说是热带鱼的代表鱼类。背鳍和腹鳍很长，极像天使展开的翅膀。是一种有较高观赏价值的热带鱼，有“观赏鱼皇后”的美称。",
        "level": 1,
        "deadEvent": 0,
        "resGroupId": 3,
        "shock": 0,
        "effectRotate": 1,
        "priority": 3,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "104": {
        "fishTypeId": "104",
        "fishName": "小丑鱼",
        "fishDesc": "小丑鱼，是对雀鲷科海葵鱼亚科鱼类的俗称，因为脸上都有一条或两条白色条纹，好似京剧中的丑角而得名，是一种热带咸水鱼。小丑鱼与海葵有着密不可分的共生关系，因此又称海葵鱼。",
        "level": 1,
        "deadEvent": 0,
        "resGroupId": 4,
        "shock": 0,
        "effectRotate": 1,
        "priority": 4,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "105": {
        "fishTypeId": "105",
        "fishName": "黑鲷鱼",
        "fishDesc": "黑鲷鱼，属于热带、温带沿岸杂食性底栖鱼类，喜栖息在沙泥底质水域，有时会进入河口内湾。性格敏感多疑，警戒性强。可用烧烤或煮汤或红烧食用。是重要的养殖鱼类，具高经济价值。",
        "level": 1,
        "deadEvent": 0,
        "resGroupId": 5,
        "shock": 0,
        "effectRotate": 1,
        "priority": 5,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "201": {
        "fishTypeId": "201",
        "fishName": "河豚",
        "fishDesc": "河豚鱼，其肉味鲜美、营养丰富，是一种名贵的高档水产品，被誉为“菜肴之冠”，但其卵巢、肝脏、肾脏、眼睛、血液中含有剧毒，处理不当或误食，轻者中毒，重者丧命。",
        "level": 2,
        "deadEvent": 0,
        "resGroupId": 6,
        "shock": 0,
        "effectRotate": 2,
        "priority": 6,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "202": {
        "fishTypeId": "202",
        "fishName": "罗汉鱼",
        "fishDesc": "罗汉鱼，因其头部隆起似罗汉而得名。该鱼体型魁梧，头顶大鼓包，短身高背，花纹秀丽，具有鲜艳夺目的色彩，且色彩变化丰富，具有很高的观赏价值，受到人们的广泛喜爱。",
        "level": 2,
        "deadEvent": 0,
        "resGroupId": 7,
        "shock": 0,
        "effectRotate": 2,
        "priority": 7,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "203": {
        "fishTypeId": "203",
        "fishName": "中华鲎",
        "fishDesc": "中华鲎，鲎由三部分组成：头胸甲略呈马蹄形，腹部呈六角形两侧具棘刺，尾部是一根长的尾剑。鲎的附肢基部有许多刺状突起并围在口的周围以咀嚼食物，故又称肢口动物。生活在浅海沙质海底。主要是肉食性动物，取食环节动物和软体动物等，有时也取食海底藻类。鲎的血液因含有铜离子显示蓝色。中华鲎血液为蓝色。",
        "level": 2,
        "deadEvent": 0,
        "resGroupId": 8,
        "shock": 0,
        "effectRotate": 2,
        "priority": 8,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "204": {
        "fishTypeId": "204",
        "fishName": "灯笼鱼",
        "fishDesc": "灯笼鱼，为中型底栖鱼类，多潜伏海底，眼睛几乎无用武之地，不善游泳，多靠腹鳍爬行。口内有锐利而且朝内倾斜的长牙，基本上，被咬中的猎物绝不可能逃走。身体裸露无鳞。特别之处是有一支由前背鳍演化而成的发光钓竿，钓竿顶端内上百万只的发光菌，状似小鱼，会发出亮光，吸引小生物成为它们的食物。",
        "level": 2,
        "deadEvent": 0,
        "resGroupId": 9,
        "shock": 0,
        "effectRotate": 2,
        "priority": 9,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "205": {
        "fishTypeId": "205",
        "fishName": "龙虾",
        "fishDesc": "龙虾，是节肢动物门软甲纲十足目龙虾科下物种的通称。它头胸部较粗大，外壳坚硬，色彩斑斓，腹部短小，体长一般在20～40厘米之间，重0.5公斤上下，部分无螯，腹肢可后天演变成螯。最重的能达到5公斤以上，人称龙虾虎。体呈粗圆筒状，背腹稍平扁，头胸甲发达，坚厚多棘，前缘中央有一对强大的眼上棘，具封闭的鳃室。主要分布于热带海域，是名贵海产品。",
        "level": 2,
        "deadEvent": 0,
        "resGroupId": 10,
        "shock": 0,
        "effectRotate": 2,
        "priority": 10,
        "chatVoiceType": 0,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "301": {
        "fishTypeId": "301",
        "fishName": "中华鲟",
        "fishDesc": "中华鲟，是长江中最大的鱼，生活于大江和近海中，故有“长江鱼王”之称。中华鲟生命周期较长，最长寿命可达40龄。是中国一级重点保护野生动物，也是活化石，有“水中大熊猫”之称。夏秋两季，生活在长江口外浅海域的中华鲟回游到长江，历经3000多公里的溯流博击，才回到金沙江一带产卵繁殖。产后待幼鱼长大到15厘米左右，又携带它们旅居外海。它们就这样世世代代在江河上游出生，在大海里生长。",
        "level": 3,
        "deadEvent": 0,
        "resGroupId": 11,
        "shock": 0,
        "effectRotate": 2,
        "priority": 11,
        "chatVoiceType": 1,
        "chatBubble": -1,
        "voiceFile": -1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "302": {
        "fishTypeId": "302",
        "fishName": "海龟",
        "fishDesc": "海龟，生活于亚热带近海上层，终身生活于海洋中。大多数海龟居住在沿岸的浅滩水域，有些种类的海龟冬季居住在食物丰富的水域，到了季产卵季节会作一次长途迁徙。食性很杂，主要分布于太平洋、大西洋及印度洋中的温暖海域。",
        "level": 3,
        "deadEvent": 0,
        "resGroupId": 12,
        "shock": 0,
        "effectRotate": 3,
        "priority": 12,
        "chatVoiceType": 1,
        "chatBubble": "干得好，爱你",
        "voiceFile": 1,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "303": {
        "fishTypeId": "303",
        "fishName": "剑鱼",
        "fishDesc": "剑鱼，亦称“箭鱼”。是热带、亚热带海洋中一种常见鱼类，因其上颌向前延伸呈剑状而得名。剑鱼分布于除北冰洋之外各大洋，其本身也是一种主要的食用鱼，具有重要渔业价值。当剑鱼向前游泳时，强壮有力的尾柄能产生巨大推动力，长矛般的长颌起着劈水的作用。以每小时130公里高速前进的剑鱼，坚硬的上颌能将很厚的船底刺穿。",
        "level": 3,
        "deadEvent": 0,
        "resGroupId": 13,
        "shock": 0,
        "effectRotate": 3,
        "priority": 13,
        "chatVoiceType": 1,
        "chatBubble": "嗯？&&来点宵夜如何",
        "voiceFile": 2,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "304": {
        "fishTypeId": "304",
        "fishName": "水母",
        "fishDesc": "水母，是水生环境中重要的浮游生物，水母是一种非常漂亮的水生动物。它的身体外形就像一把透明伞，水母身体的主要成分是水，不但透明，而且有漂浮作用。有些水母的伞状体还带有各色花纹，在蓝色的海洋里，这些游动着的色彩各异的水母显得十分美丽。",
        "level": 3,
        "deadEvent": 0,
        "resGroupId": 14,
        "shock": 0,
        "effectRotate": 3,
        "priority": 14,
        "chatVoiceType": 1,
        "chatBubble": "眼睛进了沙子&&有没有人心疼",
        "voiceFile": 3,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "305": {
        "fishTypeId": "305",
        "fishName": "魔鬼鱼",
        "fishDesc": "魔鬼鱼，是一种庞大的热带鱼类。魔鬼鱼看上去令人生畏，其实它是很温和的。它的个头和力气常使潜水员害怕，因为只要它发起怒来，只需用它那强有力的“双翅”一拍，就会碰断人的骨头，致人于死地。所以人们叫它“魔鬼鱼”。",
        "level": 3,
        "deadEvent": 0,
        "resGroupId": 15,
        "shock": 0,
        "effectRotate": 3,
        "priority": 15,
        "chatVoiceType": 1,
        "chatBubble": "最恐怖的生物&&明明是人类",
        "voiceFile": 4,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "306": {
        "fishTypeId": "306",
        "fishName": "鲨鱼",
        "fishDesc": "鲨鱼，海生，少数种类进入淡水，为一群游速快的中大型海洋鱼类，鲨鱼的感觉器官相当灵敏，甚至能嗅出几千米之外的血腥味。它们具有感应电的能力，并可以此发觉隐藏在沙底下的猎物。在中国民间，鲨软骨提取物、鲨肝油等早已被用于治疗癌症等疾病。",
        "level": 3,
        "deadEvent": 0,
        "resGroupId": 16,
        "shock": 0,
        "effectRotate": 3,
        "priority": 16,
        "chatVoiceType": 1,
        "chatBubble": "你自己闯进来的",
        "voiceFile": 5,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "601": {
        "fishTypeId": "601",
        "fishName": "鱼妖",
        "fishDesc": "鱼妖众之一，由巨大的鲸鱼变化而成，喜欢金闪闪的东西来装饰自己，随着阳光的折射，游动时散发出金色的光芒，十分绚丽，据说持续捕获鱼妖，收集的妖气会吸引“深渊龙王”的出现。",
        "level": 4,
        "deadEvent": 0,
        "resGroupId": 17,
        "shock": 1,
        "effectRotate": 4,
        "priority": 17,
        "chatVoiceType": 1,
        "chatBubble": "啊~吃撑了",
        "voiceFile": 6,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "602": {
        "fishTypeId": "602",
        "fishName": "鱼妖2",
        "fishDesc": "鱼妖众之一，吸收深渊龙王的妖气后变化而成，喜财，贪玩，是它的个性，喜欢用钱币装饰自己，据说持续捕获鱼妖，收集的妖气会吸引“深渊龙王”的出现。",
        "level": 4,
        "deadEvent": 0,
        "resGroupId": 18,
        "shock": 1,
        "effectRotate": 4,
        "priority": 18,
        "chatVoiceType": 1,
        "chatBubble": "喜欢人家的尾巴？&&小心喜欢会致命哦~",
        "voiceFile": 7,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "603": {
        "fishTypeId": "603",
        "fishName": "鱼妖3",
        "fishDesc": "鱼妖众之一，喜欢顶着聚宝盆四处游荡，据说持续捕获鱼妖，收集的妖气会吸引“深渊龙王”的出现。",
        "level": 4,
        "deadEvent": 0,
        "resGroupId": 19,
        "shock": 1,
        "effectRotate": 4,
        "priority": 19,
        "chatVoiceType": 1,
        "chatBubble": "嗯哈哈哈哈",
        "voiceFile": 8,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "604": {
        "fishTypeId": "604",
        "fishName": "鱼妖4",
        "fishDesc": "鱼妖众之一，变异龙虾，十分巨大，喜欢金闪闪的颜色，据说持续捕获鱼妖，收集的妖气会吸引“深渊龙王”的出现。",
        "level": 4,
        "deadEvent": 0,
        "resGroupId": 20,
        "shock": 1,
        "effectRotate": 4,
        "priority": 20,
        "chatVoiceType": 1,
        "chatBubble": "我~？&&是你惹不起的~！",
        "voiceFile": 9,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "605": {
        "fishTypeId": "605",
        "fishName": "鱼妖5",
        "fishDesc": "鱼妖众之一，魔鬼鱼，由于某种原因，全身血液都已经变成金色，据说持续捕获鱼妖，收集的妖气会吸引“深渊龙王”的出现。",
        "level": 4,
        "deadEvent": 0,
        "resGroupId": 21,
        "shock": 1,
        "effectRotate": 4,
        "priority": 21,
        "chatVoiceType": 1,
        "chatBubble": "迷倒的就是你",
        "voiceFile": 10,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "606": {
        "fishTypeId": "606",
        "fishName": "鱼妖6",
        "fishDesc": "鱼妖众之一，灯笼鱼，它的牙齿已经金质化，十分锋利，收集的妖气会吸引“深渊龙王”的出现。",
        "level": 4,
        "deadEvent": 0,
        "resGroupId": 22,
        "shock": 1,
        "effectRotate": 4,
        "priority": 22,
        "chatVoiceType": 1,
        "chatBubble": "啦啦啦啦啦~&&啦啦啦~啦啦啦~",
        "voiceFile": 11,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "701": {
        "fishTypeId": "701",
        "fishName": "闪电蟹",
        "fishDesc": "闪电蟹，体内含有电流元素，捕获时，可获得闪电炮台，对目标数条鱼造成连锁闪电效果。",
        "level": 7,
        "deadEvent": 2,
        "resGroupId": 23,
        "shock": 0,
        "effectRotate": 1,
        "priority": 23,
        "chatVoiceType": 6,
        "chatBubble": "额，额别，别别别",
        "voiceFile": 12,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "702": {
        "fishTypeId": "702",
        "fishName": "炎爆蟹",
        "fishDesc": "炎爆蟹，体内含有爆炸元素，捕获时，可获得炎爆炮台，对目标鱼及其周围造成大范围爆炸的效果。",
        "level": 7,
        "deadEvent": 3,
        "resGroupId": 24,
        "shock": 0,
        "effectRotate": 1,
        "priority": 24,
        "chatVoiceType": 6,
        "chatBubble": "生气了，哼！",
        "voiceFile": 13,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "703": {
        "fishTypeId": "703",
        "fishName": "龙息蟹",
        "fishDesc": "龙息蟹，体内含有喷射性火元素，捕获时，可获得龙息炮台，对直线距离上所有经过的鱼类造成效果。",
        "level": 7,
        "deadEvent": 4,
        "resGroupId": 25,
        "shock": 0,
        "effectRotate": 1,
        "priority": 25,
        "chatVoiceType": 6,
        "chatBubble": "嘿嘿？嚯嚯~",
        "voiceFile": 14,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "704": {
        "fishTypeId": "704",
        "fishName": "负剑蟹",
        "fishDesc": "负剑蟹，体内含有数个尖锐利器，捕获时，可获得仙剑炮台，直线飞行并反弹，沿途刺击路径上的鱼，且最终会范围性喷射细剑，再次对范围内鱼群造成刺击效果。",
        "level": 7,
        "deadEvent": 5,
        "resGroupId": 26,
        "shock": 0,
        "effectRotate": 1,
        "priority": 26,
        "chatVoiceType": 6,
        "chatBubble": "啊哈哈&&做条鲜鱼怎么样？",
        "voiceFile": 15,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "801": {
        "fishTypeId": "801",
        "fishName": "聚宝盆",
        "fishDesc": "聚宝盆，内有大量金银财宝，捕获时，可获得数量不等的金币。",
        "level": "8",
        "deadEvent": 6,
        "resGroupId": 27,
        "shock": 1,
        "effectRotate": 1,
        "priority": 27,
        "chatVoiceType": 1,
        "chatBubble": "想什么呢？朋友",
        "voiceFile": 16,
        "fixedResource": 1,
        "frameRate": 0.013
    },
    "802": {
        "fishTypeId": "802",
        "fishName": "玉如意",
        "fishDesc": "如意如意，如我心意，捕获时可获得数量不等的金币，但有时候不如意。",
        "level": "8",
        "deadEvent": 7,
        "resGroupId": 28,
        "shock": 1,
        "effectRotate": 1,
        "priority": 28,
        "chatVoiceType": 1,
        "chatBubble": "记住~你的未来&&只能属于我",
        "voiceFile": 17,
        "fixedResource": 1,
        "frameRate": 0.013
    },
    "901": {
        "fishTypeId": "901",
        "fishName": "财神",
        "fishDesc": "财神，背着一麻袋的红包走来走去，捕获越多，可获得的红包次数也越多。",
        "level": "9",
        "deadEvent": 0,
        "resGroupId": 29,
        "shock": 1,
        "effectRotate": 0,
        "priority": 29,
        "chatVoiceType": 3,
        "chatBubble": "诶嘿~&&对面的朋友看过来~",
        "voiceFile": 18,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "902": {
        "fishTypeId": "902",
        "fishName": "熔岩玄武",
        "fishDesc": "熔岩玄武，全身覆盖火红的龟壳，为了长期适应生活在海底火山区域，已经完全蜕变，寿命不详，捕获时，触发全屏爆炸",
        "level": "9",
        "deadEvent": 1,
        "resGroupId": 30,
        "shock": 1,
        "effectRotate": 4,
        "priority": 30,
        "chatVoiceType": 6,
        "chatBubble": "好~好舒服哇！！！",
        "voiceFile": 19,
        "fixedResource": 0,
        "frameRate": 0.013
    },
    "903": {
        "fishTypeId": "903",
        "fishName": "深渊龙王",
        "fishDesc": "恐怖的深渊龙王，千万不要激怒它，否则小心你的钱币……",
        "level": 9,
        "deadEvent": 0,
        "resGroupId": 31,
        "shock": 1,
        "effectRotate": 4,
        "priority": 31,
        "chatVoiceType": 3,
        "chatBubble": "年轻人,别因为&&头脑发热站错队",
        "voiceFile": 20,
        "fixedResource": 0,
        "frameRate": 0.013
    }
}