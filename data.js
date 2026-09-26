const GAME_DATA = {
  version: "0.4.0",
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
      id:"gaodi",name:"寨沟高地中心",owner:"gaodi",x:43,y:29,
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
    {id:"shang_general",name:"王族子启",faction:"shang",role:"王族将领",age:35,command:73,martial:76,admin:48,intrigue:44,diplomacy:51,ritual:63,prestige:59,trait:"车战娴熟",alive:true,confidence:"C"},
    {id:"shang_steward",name:"卜臣旅",faction:"shang",role:"卜臣",age:39,command:45,martial:38,admin:68,intrigue:66,diplomacy:55,ritual:84,prestige:52,trait:"谨慎占断",alive:true,confidence:"C"},

    {id:"jili",name:"季历",faction:"zhou",role:"周君",age:41,command:84,martial:77,admin:75,intrigue:64,diplomacy:73,ritual:69,prestige:72,trait:"西土开拓",alive:true,confidence:"B"},
    {id:"zhou_general",name:"周宗伯仲",faction:"zhou",role:"宗族将领",age:32,command:70,martial:71,admin:56,intrigue:51,diplomacy:58,ritual:66,prestige:54,trait:"族兵凝聚",alive:true,confidence:"C"},
    {id:"zhou_steward",name:"太史辛",faction:"zhou",role:"史臣",age:46,command:48,martial:37,admin:77,intrigue:63,diplomacy:69,ritual:76,prestige:50,trait:"善治仓廪",alive:true,confidence:"C"},

    {id:"gaodi_lord",name:"高地君长",faction:"gaodi",role:"君长",age:38,command:76,martial:79,admin:57,intrigue:67,diplomacy:55,ritual:51,prestige:61,trait:"山地熟习",alive:true,confidence:"C"},
    {id:"east_lord",name:"东方盟主",faction:"dongfang",role:"地方君长",age:40,command:71,martial:68,admin:64,intrigue:61,diplomacy:62,ritual:58,prestige:57,trait:"东土联结",alive:true,confidence:"C"},
    {id:"jiang_lord",name:"江汉君长",faction:"jianghan",role:"地方君长",age:37,command:67,martial:66,admin:65,intrigue:57,diplomacy:64,ritual:61,prestige:52,trait:"舟陆并用",alive:true,confidence:"C"},
    {id:"wu_lord",name:"南方君长",faction:"wucheng",role:"地方君长",age:42,command:65,martial:62,admin:70,intrigue:59,diplomacy:60,ritual:67,prestige:56,trait:"青铜工艺",alive:true,confidence:"C"},
    {id:"shu_lord",name:"蜀地君长",faction:"shu",role:"地方君长",age:39,command:69,martial:65,admin:72,intrigue:66,diplomacy:58,ritual:78,prestige:68,trait:"古蜀礼器传统",alive:true,confidence:"C"}
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
      morale:32,order:29,melee:18,missile:0,armor:5,speed:44,terrain:"foot",
      description:"从奴隶人口中临时征发，配发木、骨制简易兵器。成军快，士气低。"
    },
    clan_levy:{
      name:"族兵",short:"族兵",size:100,kind:"levy",population:"clan",
      weapon:"wood",weaponNeed:80,shell:34,grain:35,fodder:0,train:0,laborNeed:8,
      morale:50,order:48,melee:28,missile:0,armor:8,speed:46,terrain:"foot",
      description:"由族人临时征召的基础步兵。组织和士气优于奴隶兵。"
    },
    archer:{
      name:"弓手",short:"弓手",size:80,kind:"trained",population:"clan",
      weapon:"bow",weaponNeed:80,shell:82,grain:45,fodder:0,train:1,laborNeed:7,
      morale:56,order:52,melee:14,missile:40,armor:5,speed:47,terrain:"foot",
      description:"受过基础编练的远射兵。适合扰乱敌军队形和士气。"
    },
    bronze_ge:{
      name:"青铜戈兵",short:"戈兵",size:80,kind:"regular",population:"clan",
      weapon:"ge",weaponNeed:80,shell:145,grain:65,fodder:0,train:2,laborNeed:10,
      morale:68,order:69,melee:57,missile:0,armor:18,speed:43,terrain:"foot",
      description:"装备青铜戈的正规步兵，需要时间训练成军。"
    },
    bronze_spear:{
      name:"青铜矛兵",short:"矛兵",size:80,kind:"regular",population:"clan",
      weapon:"spear",weaponNeed:80,shell:140,grain:65,fodder:0,train:2,laborNeed:10,
      morale:66,order:72,melee:54,missile:0,armor:17,speed:42,terrain:"foot",
      description:"正规矛兵，正面守阵和抗击车乘能力更好。"
    },
    royal_guard:{
      name:"王族甲士",short:"甲士",size:60,kind:"elite",population:"clan",
      weapon:"ge",weaponNeed:60,shell:240,grain:90,fodder:0,train:3,laborNeed:10,
      morale:82,order:82,melee:72,missile:0,armor:36,speed:41,terrain:"foot",
      description:"少量精锐家臣与甲士，昂贵但极难被正面击溃。"
    },
    chariot:{
      name:"战车乘",short:"战车",size:24,kind:"regular",population:"clan",
      weapon:"chariot",weaponNeed:6,shell:300,grain:90,fodder:140,train:3,laborNeed:18,
      morale:79,order:76,melee:64,missile:24,armor:24,speed:82,terrain:"chariot",
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