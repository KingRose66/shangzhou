const GAME_DATA = {
  version: "1.8.0",
  title: "大邑商：四土",
  seasons: ["春","夏","秋","冬"],
  factions: {
    shang: {
      name:"大邑商", short:"商", ruler:"文丁", color:"#a7523e",
      shells:5200, prestige:82, livestock:860,
      tech:["piece_mold","chariot_craft","royal_divination"],
      relations:{zhou:35,gaodi:-15,dongfang:-8,jianghan:5,wucheng:0,shu:2,neutral:0}
    },
    zhou: {
      name:"周", short:"周", ruler:"季历", color:"#c4a64d",
      shells:2450, prestige:46, livestock:420,
      tech:["lineage_muster","wei_farming"],
      relations:{shang:35,gaodi:8,dongfang:0,jianghan:0,wucheng:0,shu:4,neutral:5}
    },
    gaodi: {
      name:"晋陕高地方", short:"高地", ruler:"高地君长", color:"#688c69",
      shells:1600, prestige:38, livestock:720,
      tech:["hill_march","pastoral_trade"],
      relations:{shang:-15,zhou:8,dongfang:0,jianghan:0,wucheng:0,shu:0,neutral:0}
    },
    dongfang: {
      name:"东方诸方", short:"东方", ruler:"东方盟主", color:"#8e6b58",
      shells:1900, prestige:44, livestock:460,
      tech:["local_craft","lineage_muster"],
      relations:{shang:-8,zhou:0,gaodi:0,jianghan:4,wucheng:0,shu:0,neutral:0}
    },
    jianghan: {
      name:"江汉诸方", short:"江汉", ruler:"江汉君长", color:"#4e7b70",
      shells:1550, prestige:39, livestock:390,
      tech:["local_craft","long_supply"],
      relations:{shang:5,zhou:0,gaodi:0,dongfang:4,wucheng:8,shu:2,neutral:0}
    },
    wucheng: {
      name:"吴城文化诸邑", short:"吴城", ruler:"南方君长", color:"#7b5f82",
      shells:1700, prestige:43, livestock:330,
      tech:["improved_mold","local_craft"],
      relations:{shang:0,zhou:0,gaodi:0,dongfang:0,jianghan:8,shu:3,neutral:0}
    },
    shu: {
      name:"成都平原古蜀", short:"古蜀", ruler:"蜀地君长", color:"#94733c",
      shells:2100, prestige:55, livestock:510,
      tech:["improved_mold","highland_stock"],
      relations:{shang:2,zhou:4,gaodi:0,dongfang:0,jianghan:2,wucheng:3,neutral:0}
    },
    neutral: {
      name:"小方与族邑", short:"小方", ruler:"族长", color:"#77716a",
      shells:900, prestige:25, livestock:310,
      tech:["local_craft"],
      relations:{shang:0,zhou:5,gaodi:0}
    }
  },

  settlements: [
    {
      id:"yin", name:"大邑商·殷", owner:"shang", x:76,y:46, capital:true,
      terrain:"plain", region:"洹河平原", confidence:"A",
      pop:{clan:42500,slave:18400}, grain:18600,fodder:7200,bronze:1480,
      weapons:{wood:2600,bow:640,ge:930,spear:520,chariot:46},
      farm:88, forge:3, market:3, wall:1,
      roads:["taihang","jinnan","nan","daxinzhuang"]
    },
    {
      id:"taihang",name:"太行东麓邑",owner:"shang",x:66,y:35,
      terrain:"hill",region:"太行山前",confidence:"C",
      pop:{clan:6900,slave:2100},grain:4600,fodder:1750,bronze:270,
      weapons:{wood:700,bow:160,ge:150,spear:90,chariot:8},
      farm:61,forge:1,market:1,wall:1,roads:["yin","jinnan","north"]
    },
    {
      id:"nan",name:"王畿南邑",owner:"shang",x:81,y:64,
      terrain:"plain",region:"豫北",confidence:"C",
      pop:{clan:9200,slave:3600},grain:6900,fodder:1900,bronze:220,
      weapons:{wood:1100,bow:120,ge:110,spear:70,chariot:4},
      farm:82,forge:1,market:1,wall:0,roads:["yin","nanyang"]
    },
    {
      id:"jinnan",name:"晋南商系据点",owner:"shang",x:56,y:48,
      terrain:"rolling",region:"晋南",confidence:"B",
      pop:{clan:5400,slave:1700},grain:4100,fodder:1800,bronze:190,
      weapons:{wood:650,bow:130,ge:105,spear:55,chariot:5},
      farm:60,forge:1,market:1,wall:1,roads:["yin","taihang","crossing","gaodi"]
    },
    {
      id:"crossing",name:"黄河渡口邑",owner:"neutral",x:45,y:52,
      terrain:"river",region:"晋陕峡谷",confidence:"C",
      pop:{clan:3200,slave:850},grain:2500,fodder:1200,bronze:80,
      weapons:{wood:400,bow:80,ge:40,spear:25,chariot:1},
      farm:52,forge:0,market:2,wall:0,roads:["jinnan","zhouyuan","gaodi"]
    },
    {
      id:"gaodi",name:"寨沟高地中心",owner:"gaodi",x:43,y:29,capital:true,
      terrain:"highland",region:"陕北清涧",confidence:"A",
      pop:{clan:7600,slave:1800},grain:3500,fodder:3700,bronze:260,
      weapons:{wood:1000,bow:230,ge:120,spear:65,chariot:7},
      farm:43,forge:1,market:1,wall:1,roads:["jinnan","crossing","zhouyuan","lijia"]
    },
    {
      id:"zhouyuan",name:"周原",owner:"zhou",x:29,y:58,capital:true,
      terrain:"plain",region:"岐山—扶风",confidence:"A",
      pop:{clan:17200,slave:5300},grain:10400,fodder:3900,bronze:510,
      weapons:{wood:1800,bow:320,ge:230,spear:160,chariot:13},
      farm:86,forge:2,market:2,wall:1,roads:["crossing","gaodi","weis","west","laoniupo"]
    },
    {
      id:"weis",name:"渭水东部邑",owner:"zhou",x:38,y:70,
      terrain:"plain",region:"关中东部",confidence:"C",
      pop:{clan:7800,slave:2100},grain:6200,fodder:2100,bronze:140,
      weapons:{wood:880,bow:120,ge:80,spear:55,chariot:3},
      farm:90,forge:0,market:1,wall:0,roads:["zhouyuan","laoniupo"]
    },
    {
      id:"west",name:"西部诸邑",owner:"neutral",x:17,y:48,
      terrain:"rolling",region:"渭河上游",confidence:"C",
      pop:{clan:4100,slave:800},grain:2700,fodder:2600,bronze:90,
      weapons:{wood:520,bow:110,ge:35,spear:25,chariot:2},
      farm:48,forge:0,market:1,wall:0,roads:["zhouyuan"]
    },
    {id:"lijia",name:"李家崖诸聚落",owner:"gaodi",x:39,y:16,
      terrain:"highland",region:"晋陕高地",confidence:"A",
      pop:{clan:4300,slave:900},grain:2200,fodder:3100,bronze:170,
      weapons:{wood:620,bow:130,ge:65,spear:40,chariot:3},
      farm:36,forge:1,market:1,wall:1,roads:["gaodi","north"]
    },
    {id:"north",name:"北方贸易口",owner:"neutral",x:58,y:8,
      terrain:"highland",region:"北方边缘",confidence:"C",
      pop:{clan:2400,slave:420},grain:1300,fodder:2800,bronze:55,
      weapons:{wood:330,bow:90,ge:20,spear:18,chariot:1},
      farm:28,forge:0,market:2,wall:0,roads:["lijia","taihang"]
    },
    {id:"laoniupo",name:"老牛坡商文化据点",owner:"shang",x:41,y:70,
      terrain:"plain",region:"关中东部",confidence:"B",
      pop:{clan:4600,slave:1300},grain:3300,fodder:1500,bronze:160,
      weapons:{wood:560,bow:90,ge:90,spear:55,chariot:4},
      farm:69,forge:1,market:1,wall:1,roads:["zhouyuan","weis","hanzhong"]
    },
    {id:"daxinzhuang",name:"大辛庄",owner:"shang",x:90,y:40,
      terrain:"plain",region:"济南地区",confidence:"A",
      pop:{clan:9800,slave:3100},grain:6900,fodder:1900,bronze:250,
      weapons:{wood:980,bow:180,ge:150,spear:95,chariot:7},
      farm:79,forge:1,market:2,wall:1,roads:["yin","qianzhangda"]
    },
    {id:"qianzhangda",name:"前掌大",owner:"dongfang",x:92,y:57,capital:true,
      terrain:"plain",region:"鲁南",confidence:"A",
      pop:{clan:11200,slave:3200},grain:7200,fodder:2400,bronze:330,
      weapons:{wood:1200,bow:210,ge:180,spear:105,chariot:9},
      farm:76,forge:1,market:2,wall:1,roads:["daxinzhuang","haidai","huaibei"]
    },
    {id:"haidai",name:"海岱东部诸邑",owner:"dongfang",x:97,y:44,
      terrain:"plain",region:"山东东部",confidence:"C",
      pop:{clan:5600,slave:1100},grain:4300,fodder:1600,bronze:100,
      weapons:{wood:650,bow:120,ge:55,spear:35,chariot:2},
      farm:72,forge:0,market:2,wall:0,roads:["qianzhangda"]
    },
    {id:"huaibei",name:"淮北交通邑",owner:"neutral",x:85,y:71,
      terrain:"river",region:"淮北",confidence:"C",
      pop:{clan:5100,slave:1000},grain:3900,fodder:1400,bronze:80,
      weapons:{wood:610,bow:130,ge:45,spear:30,chariot:1},
      farm:77,forge:0,market:2,wall:0,roads:["qianzhangda","nanyang"]
    },
    {id:"nanyang",name:"江汉北部门户",owner:"neutral",x:71,y:75,
      terrain:"rolling",region:"南阳—襄阳通道",confidence:"C",
      pop:{clan:6500,slave:1400},grain:4700,fodder:1700,bronze:120,
      weapons:{wood:760,bow:160,ge:65,spear:40,chariot:2},
      farm:73,forge:0,market:2,wall:1,roads:["nan","huaibei","jianghan","hanzhong"]
    },
    {id:"jianghan",name:"江汉中心邑",owner:"jianghan",x:70,y:85,capital:true,
      terrain:"river",region:"江汉平原",confidence:"C",
      pop:{clan:10500,slave:2500},grain:7900,fodder:2200,bronze:260,
      weapons:{wood:1200,bow:260,ge:125,spear:85,chariot:3},
      farm:84,forge:1,market:2,wall:1,roads:["nanyang","wucheng"]
    },
    {id:"wucheng",name:"吴城",owner:"wucheng",x:82,y:92,capital:true,
      terrain:"rolling",region:"赣江流域",confidence:"A",
      pop:{clan:9200,slave:2100},grain:6200,fodder:1700,bronze:430,
      weapons:{wood:980,bow:170,ge:190,spear:125,chariot:2},
      farm:69,forge:2,market:2,wall:1,roads:["jianghan"]
    },
    {id:"hanzhong",name:"汉中交换节点",owner:"neutral",x:45,y:84,
      terrain:"hill",region:"汉中盆地",confidence:"C",
      pop:{clan:4800,slave:900},grain:3400,fodder:1800,bronze:95,
      weapons:{wood:570,bow:125,ge:45,spear:35,chariot:1},
      farm:63,forge:0,market:2,wall:1,roads:["nanyang","laoniupo","shu"]
    },
    {id:"shu",name:"成都平原古蜀中心",owner:"shu",x:23,y:91,capital:true,
      terrain:"plain",region:"成都平原",confidence:"B",
      pop:{clan:15800,slave:3600},grain:10600,fodder:3000,bronze:620,
      weapons:{wood:1500,bow:290,ge:240,spear:170,chariot:2},
      farm:88,forge:2,market:3,wall:1,roads:["hanzhong"]
    }
  ],

  characters: [
    {id:"wen_ding",name:"文丁",faction:"shang",role:"商王",age:43,command:78,martial:63,admin:76,intrigue:71,diplomacy:69,ritual:88,prestige:92,trait:"守成威权",alive:true,confidence:"B"},
    {id:"di_yi",name:"帝乙",faction:"shang",role:"王子",age:24,command:69,martial:57,admin:73,intrigue:67,diplomacy:70,ritual:82,prestige:66,trait:"持重承统",alive:true,confidence:"B"},
    {id:"shang_general",name:"王族子启",faction:"shang",role:"王族将领",age:35,command:73,martial:76,admin:48,intrigue:44,diplomacy:51,ritual:63,prestige:59,trait:"车战娴熟",alive:true,confidence:"C"},
    {id:"shang_steward",name:"卜臣旅",faction:"shang",role:"卜臣",age:39,command:45,martial:38,admin:68,intrigue:66,diplomacy:55,ritual:84,prestige:52,trait:"谨慎占断",alive:true,confidence:"C"},

    {id:"jili",name:"季历",faction:"zhou",role:"周君",age:41,command:84,martial:77,admin:75,intrigue:64,diplomacy:73,ritual:69,prestige:72,trait:"西土开拓",alive:true,confidence:"B"},
    {id:"ji_chang",name:"姬昌",faction:"zhou",role:"公子",age:34,command:78,martial:62,admin:82,intrigue:72,diplomacy:81,ritual:76,prestige:70,trait:"西岐经营",alive:true,confidence:"B"},
    {id:"zhou_general",name:"周宗伯仲",faction:"zhou",role:"宗族将领",age:32,command:70,martial:71,admin:56,intrigue:51,diplomacy:58,ritual:66,prestige:54,trait:"族兵凝聚",alive:true,confidence:"C"},
    {id:"zhou_steward",name:"太史辛",faction:"zhou",role:"史臣",age:46,command:48,martial:37,admin:77,intrigue:63,diplomacy:69,ritual:76,prestige:50,trait:"善治仓廪",alive:true,confidence:"C"},

    {id:"gaodi_lord",name:"高地君长",faction:"gaodi",role:"君长",age:38,command:76,martial:79,admin:57,intrigue:67,diplomacy:55,ritual:51,prestige:61,trait:"山地熟习",alive:true,confidence:"C"},
    {id:"east_lord",name:"东方盟主",faction:"dongfang",role:"地方君长",age:40,command:71,martial:68,admin:64,intrigue:61,diplomacy:62,ritual:58,prestige:57,trait:"东土联结",alive:true,confidence:"C"},
    {id:"jiang_lord",name:"江汉君长",faction:"jianghan",role:"地方君长",age:37,command:67,martial:66,admin:65,intrigue:57,diplomacy:64,ritual:61,prestige:52,trait:"舟陆并用",alive:true,confidence:"C"},
    {id:"wu_lord",name:"南方君长",faction:"wucheng",role:"地方君长",age:42,command:65,martial:62,admin:70,intrigue:59,diplomacy:60,ritual:67,prestige:56,trait:"青铜工艺",alive:true,confidence:"C"},
    {id:"shu_lord",name:"蜀地君长",faction:"shu",role:"地方君长",age:39,command:69,martial:65,admin:72,intrigue:66,diplomacy:58,ritual:78,prestige:68,trait:"古蜀礼器传统",alive:true,confidence:"C"},
    {id:"shang_ya_yin",name:"亚尹伯",faction:"shang",role:"王畿族长",age:57,command:78,martial:72,admin:59,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"守成威权",alive:true,confidence:"C",location:{kind:"settlement",id:"yin"}},
    {id:"shang_zuo_ce",name:"作册小乙",faction:"shang",role:"王廷史臣",age:35,command:62,martial:43,admin:84,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"谨慎占断",alive:true,confidence:"C",location:{kind:"settlement",id:"yin"}},
    {id:"shang_tian",name:"田臣丙",faction:"shang",role:"农事官",age:38,command:52,martial:43,admin:86,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"善治仓廪",alive:true,confidence:"C",location:{kind:"settlement",id:"nan"}},
    {id:"shang_zhen",name:"贞人壬",faction:"shang",role:"占卜官",age:48,command:54,martial:43,admin:66,intrigue:53,diplomacy:55,ritual:85,prestige:48,trait:"谨慎占断",alive:true,confidence:"C",location:{kind:"settlement",id:"yin"}},
    {id:"shang_rong",name:"戍长戎",faction:"shang",role:"边邑将领",age:39,command:79,martial:72,admin:49,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"山地熟习",alive:true,confidence:"C",location:{kind:"settlement",id:"jinnan"}},
    {id:"shang_zhu",name:"百工祖甲",faction:"shang",role:"铸作首领",age:44,command:49,martial:43,admin:76,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"青铜工艺",alive:true,confidence:"C",location:{kind:"settlement",id:"daxinzhuang"}},
    {id:"zhou_ji_jue",name:"姬伯觉",faction:"zhou",role:"宗族将领",age:34,command:77,martial:72,admin:54,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"族兵凝聚",alive:true,confidence:"C",location:{kind:"settlement",id:"zhouyuan"}},
    {id:"zhou_jiang",name:"姜伯言",faction:"zhou",role:"婚盟使者",age:39,command:46,martial:43,admin:71,intrigue:53,diplomacy:79,ritual:56,prestige:48,trait:"东土联结",alive:true,confidence:"C",location:{kind:"settlement",id:"zhouyuan"}},
    {id:"zhou_ya",name:"周作册庚",faction:"zhou",role:"史臣",age:41,command:48,martial:43,admin:81,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"善治仓廪",alive:true,confidence:"C",location:{kind:"settlement",id:"zhouyuan"}},
    {id:"zhou_zhao",name:"周田臣仲",faction:"zhou",role:"田事主管",age:36,command:55,martial:43,admin:83,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"善治仓廪",alive:true,confidence:"C",location:{kind:"settlement",id:"weis"}},
    {id:"zhou_shan",name:"渭上伯辛",faction:"zhou",role:"边地将领",age:29,command:75,martial:72,admin:53,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"西土开拓",alive:true,confidence:"C",location:{kind:"settlement",id:"weis"}},
    {id:"gao_shi",name:"高地族伯犬",faction:"gaodi",role:"山地将领",age:33,command:80,martial:72,admin:55,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"山地熟习",alive:true,confidence:"C",location:{kind:"settlement",id:"gaodi"}},
    {id:"gao_ji",name:"李崖田臣",faction:"gaodi",role:"仓廪主管",age:40,command:53,martial:43,admin:76,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"善治仓廪",alive:true,confidence:"C",location:{kind:"settlement",id:"lijia"}},
    {id:"gao_hu",name:"黄河戍伯",faction:"gaodi",role:"渡口统领",age:38,command:73,martial:72,admin:57,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"山地熟习",alive:true,confidence:"C",location:{kind:"settlement",id:"gaodi"}},
    {id:"east_zhu",name:"东方族伯戊",faction:"dongfang",role:"邑族首领",age:47,command:59,martial:43,admin:76,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"东土联结",alive:true,confidence:"C",location:{kind:"settlement",id:"qianzhangda"}},
    {id:"east_zhong",name:"海岱伯仲",faction:"dongfang",role:"边地将领",age:31,command:75,martial:72,admin:54,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"车战娴熟",alive:true,confidence:"C",location:{kind:"settlement",id:"haidai"}},
    {id:"east_yan",name:"前掌大作册",faction:"dongfang",role:"地方史臣",age:43,command:46,martial:43,admin:79,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"谨慎占断",alive:true,confidence:"C",location:{kind:"settlement",id:"qianzhangda"}},
    {id:"han_bo",name:"江汉舟伯",faction:"jianghan",role:"舟陆将领",age:39,command:73,martial:72,admin:60,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"舟陆并用",alive:true,confidence:"C",location:{kind:"settlement",id:"jianghan"}},
    {id:"han_cang",name:"江汉仓臣",faction:"jianghan",role:"农事主管",age:45,command:47,martial:43,admin:83,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"善治仓廪",alive:true,confidence:"C",location:{kind:"settlement",id:"jianghan"}},
    {id:"han_zhu",name:"南土作坊长",faction:"jianghan",role:"工匠首领",age:37,command:52,martial:43,admin:72,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"青铜工艺",alive:true,confidence:"C",location:{kind:"settlement",id:"jianghan"}},
    {id:"wu_tao",name:"吴城陶范师",faction:"wucheng",role:"制范首领",age:46,command:44,martial:43,admin:82,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"青铜工艺",alive:true,confidence:"C",location:{kind:"settlement",id:"wucheng"}},
    {id:"wu_shan",name:"赣江猎长",faction:"wucheng",role:"山地将领",age:30,command:72,martial:72,admin:55,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"山地熟习",alive:true,confidence:"C",location:{kind:"settlement",id:"wucheng"}},
    {id:"wu_ji",name:"南土族长乙",faction:"wucheng",role:"族邑主管",age:40,command:61,martial:43,admin:73,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"族兵凝聚",alive:true,confidence:"C",location:{kind:"settlement",id:"wucheng"}},
    {id:"shu_bai",name:"蜀邑祭伯",faction:"shu",role:"祭祀首领",age:52,command:49,martial:43,admin:72,intrigue:53,diplomacy:55,ritual:85,prestige:48,trait:"古蜀礼器传统",alive:true,confidence:"C",location:{kind:"settlement",id:"shu"}},
    {id:"shu_tong",name:"蜀地铜作师",faction:"shu",role:"铸工首领",age:38,command:42,martial:43,admin:84,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"青铜工艺",alive:true,confidence:"C",location:{kind:"settlement",id:"shu"}},
    {id:"shu_han",name:"蜀道戍长",faction:"shu",role:"山地将领",age:32,command:77,martial:72,admin:53,intrigue:53,diplomacy:55,ritual:56,prestige:48,trait:"山地熟习",alive:true,confidence:"C",location:{kind:"settlement",id:"shu"}}
  ],

  successions: {
    shang:["di_yi"],
    zhou:["ji_chang"]
  },

  relationshipSeeds: [
    {a:"wen_ding",b:"di_yi",value:78,type:"父子",confidence:"B"},
    {a:"jili",b:"ji_chang",value:82,type:"父子",confidence:"B"},
    {a:"wen_ding",b:"shang_general",value:48,type:"王族",confidence:"C"},
    {a:"wen_ding",b:"shang_steward",value:44,type:"君臣",confidence:"C"},
    {a:"jili",b:"zhou_general",value:52,type:"宗族",confidence:"C"},
    {a:"jili",b:"zhou_steward",value:46,type:"君臣",confidence:"C"}
  ],

  archive: [
    {name:"武丁",era:"武丁时期",confidence:"A",note:"商王。适合独立的“武丁中兴”开局。"},
    {name:"妇好",era:"武丁时期",confidence:"A",note:"王后、军事统帅。后续剧本将拥有封邑、军队与祭祀身份。"},
    {name:"祖庚",era:"武丁之后",confidence:"A",note:"可用于更早的晚商剧本人物链。"}
  ],

  units: {
    slave_levy:{
      name:"征发奴隶",short:"奴隶兵",size:120,kind:"levy",population:"slave",
      weapon:"wood",weaponNeed:100,shell:20,grain:30,fodder:0,train:0,laborNeed:8,
      morale:32,order:29,melee:18,missile:0,range:0,armor:5,speed:44,terrain:"foot",confidence:"C",
      description:"从奴隶人口中临时征发，配发木、骨制简易兵器。成军快，士气低。"
    },
    clan_levy:{
      name:"族兵",short:"族兵",size:100,kind:"levy",population:"clan",
      weapon:"wood",weaponNeed:80,shell:34,grain:35,fodder:0,train:0,laborNeed:8,
      morale:50,order:48,melee:28,missile:0,range:0,armor:8,speed:46,terrain:"foot",confidence:"C",
      description:"由族人临时征召的基础步兵。组织和士气优于奴隶兵。"
    },
    archer:{
      name:"弓手",short:"弓手",size:80,kind:"trained",population:"clan",
      weapon:"bow",weaponNeed:80,shell:82,grain:45,fodder:0,train:1,laborNeed:7,
      morale:56,order:52,melee:14,missile:40,range:190,armor:5,speed:47,terrain:"foot",confidence:"A",
      description:"受过基础编练的远射兵。适合扰乱敌军队形和士气。"
    },
    hunter:{
      name:"猎手投矛兵",short:"投矛",size:80,kind:"trained",population:"clan",
      weapon:"wood",weaponNeed:70,shell:58,grain:38,fodder:0,train:1,laborNeed:6,
      morale:52,order:45,melee:23,missile:29,range:108,armor:4,speed:52,terrain:"light",confidence:"C",
      description:"由猎手与轻装人员编成的近距离投射兵。作为合理玩法复原，不宣称存在同名正规军制。"
    },
    bronze_ge:{
      name:"青铜戈兵",short:"戈兵",size:80,kind:"regular",population:"clan",
      weapon:"ge",weaponNeed:80,shell:145,grain:65,fodder:0,train:2,laborNeed:10,
      morale:68,order:69,melee:57,missile:0,range:0,armor:18,speed:43,terrain:"foot",confidence:"B",
      description:"装备青铜戈的正规步兵，需要时间训练成军。"
    },
    bronze_spear:{
      name:"青铜矛兵",short:"矛兵",size:80,kind:"regular",population:"clan",
      weapon:"spear",weaponNeed:80,shell:140,grain:65,fodder:0,train:2,laborNeed:10,
      morale:66,order:72,melee:54,missile:0,range:0,armor:17,speed:42,terrain:"foot",confidence:"B",
      description:"正规矛兵，正面守阵和抗击车乘能力更好。"
    },
    royal_guard:{
      name:"王族甲士",short:"甲士",size:60,kind:"elite",population:"clan",
      weapon:"ge",weaponNeed:60,shell:240,grain:90,fodder:0,train:3,laborNeed:10,
      morale:82,order:82,melee:72,missile:0,range:0,armor:36,speed:41,terrain:"foot",confidence:"C",
      description:"少量精锐家臣与甲士，昂贵但极难被正面击溃。"
    },
    chariot:{
      name:"战车乘",short:"战车",size:24,kind:"regular",population:"clan",
      weapon:"chariot",weaponNeed:6,shell:300,grain:90,fodder:140,train:3,laborNeed:18,
      morale:79,order:76,melee:64,missile:24,range:145,armor:24,speed:82,terrain:"chariot",confidence:"A",
      description:"六乘为一队的贵族车战编制。擅长机动、侧击、威慑和追击。"
    }
  },

  techs: {
    piece_mold:{name:"成熟陶范铸造",effect:"青铜兵器季度产出 +20%",confidence:"A"},
    chariot_craft:{name:"车作",effect:"战车维护与草料损耗 -10%",confidence:"A"},
    royal_divination:{name:"王室占卜体系",effect:"占卜提示略更可靠，祭祀威望 +1",confidence:"A"},
    lineage_muster:{name:"宗族征召",effect:"族兵征召贝成本 -15%",confidence:"B"},
    wei_farming:{name:"渭水农作组织",effect:"秋收 +8%",confidence:"C"},
    hill_march:{name:"山地行军",effect:"丘陵/高地行军惩罚降低",confidence:"B"},
    pastoral_trade:{name:"马畜贸易",effect:"草料与牲畜交易更有利",confidence:"B"},
    local_craft:{name:"地方工艺",effect:"基础木骨兵器产出 +10%",confidence:"C"},
    wheel_maintenance:{name:"改良车轮维护",effect:"战车行军故障与草料损耗 -15%",confidence:"C"},
    long_supply:{name:"远程粮运组织",effect:"每100兵所需民夫 -2，远征补给损耗 -12%",confidence:"C"},
    improved_mold:{name:"外来陶范技法",effect:"铸造作坊青铜兵器产出 +15%",confidence:"C"},
    highland_stock:{name:"高地畜牧经验",effect:"草料季度产出 +15%",confidence:"C"},
    fortification:{name:"筑垣经验",effect:"聚落防御值 +15%",confidence:"C"}
  }
};

window.GAME_DATA = GAME_DATA;
/*
 * Geography layer: WGS84 geographic anchors used by the modern relief/satellite basemap.
 * A = securely located archaeological site, B = approximate archaeological region,
 * C = composite gameplay settlement placed in its plausible geographical corridor.
 * These are NOT claims about exact late-Shang political boundaries or river courses.
 */
const SHANGZHOU_GEO_ANCHORS = {
  "yin": [
    36.1267,
    114.3139,
    "A"
  ],
  "taihang": [
    37.18,
    113.53,
    "C"
  ],
  "nan": [
    35.34,
    114.17,
    "C"
  ],
  "jinnan": [
    35.62,
    111.42,
    "C"
  ],
  "crossing": [
    35.46,
    110.45,
    "C"
  ],
  "gaodi": [
    37.11,
    110.14,
    "B"
  ],
  "zhouyuan": [
    34.48,
    107.77,
    "B"
  ],
  "weis": [
    34.43,
    109.35,
    "C"
  ],
  "west": [
    34.68,
    106.56,
    "C"
  ],
  "lijia": [
    38.14,
    110.55,
    "B"
  ],
  "north": [
    39.18,
    112.75,
    "C"
  ],
  "laoniupo": [
    34.24,
    109.12,
    "B"
  ],
  "daxinzhuang": [
    36.67,
    117.03,
    "B"
  ],
  "qianzhangda": [
    34.89426,
    117.21317,
    "A"
  ],
  "haidai": [
    36.38,
    119.11,
    "C"
  ],
  "huaibei": [
    33.52,
    116.57,
    "C"
  ],
  "nanyang": [
    33.08,
    112.54,
    "C"
  ],
  "jianghan": [
    30.75,
    112.45,
    "C"
  ],
  "wucheng": [
    28.17,
    115.45,
    "B"
  ],
  "hanzhong": [
    33.06,
    107.03,
    "C"
  ],
  "shu": [
    30.95,
    104.15,
    "C"
  ]
};
window.GAME_DATA.settlements.forEach(function(settlement){
  const anchor=SHANGZHOU_GEO_ANCHORS[settlement.id];
  if(!anchor)throw new Error("No geographic anchor for "+settlement.id);
  settlement.lat=anchor[0];
  settlement.lon=anchor[1];
  settlement.geographyConfidence=anchor[2];
});
