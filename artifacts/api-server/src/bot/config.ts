export const CONFIG = {
  guildId: process.env.DISCORD_GUILD_ID ?? "",
  clientId: process.env.DISCORD_CLIENT_ID ?? "",
  token: process.env.DISCORD_BOT_TOKEN ?? "",

  // Bina rolleri
  houses: {
    gryffindor: "1165699166228455549",
    slytherin: "1165699167994249256",
    ravenclaw: "1165699168816332812",
    hufflepuff: "1165699170359844944",
  },

  // Özel kanal ID'leri
  channels: {
    sortingHat: "1165699527861354577",
    applications: "1165699650871894169",
    characterIntro: "1405276044981698601",
    announcements: "1165700089424130139",
    lessonLog: "1165699712318451742",
    housePoints: process.env.CHANNEL_HOUSE_POINTS ?? "",
  },

  // Rol ID'leri
  roles: {
    professor: "1165699143398871040",
    mudur: "1165699140190220308",
    mudurYardimcisi: "1165699141192655118",
    ogrenci: "1165699163334398204",
    firstYear: "1. Sınıf", // No ID provided, check by name
    secondYear: "1165699161916702803",
    thirdYear: "1165699159593058364",
    fourthYear: "1165699158221525024",
    fifthYear: "1165699156745125949",
    sixthYear: "1165699154668961944",
    seventhYear: "1165699154014654625",
    stajyer: "1165699152836051047",
    mezun: "1165699151724552384",
    safkan: "1165699173417492530",
    melez: "1165699174113755289",
    muggleDogu: "1165699175506247770",
    cadi: "1165699176244465796",
    buyucu: "1165699177238515882",
    auror: "1165699112952410212",
    sihirBakani: "1165699105574629478",
    seherbazGenerali: "1165699110934941786",
    seherbazSefi: "1165699111585071137",
    bakanlikDenetcisi: "1165699109953470514",
    bakanlikCalisani: "1165699128827859097",
    noximusLideri: "1165699118727970877",
    noximusGenerali: "1165699120544092190",
    noximusSefi: "1165699121387143328",
    noximus: "1165699122226020484",
    introNotWritten: "1165699102504398940",
    unregistered: "1165699194770690148",
  },

  // Derslerin rol ID'leri
  subjects: {
    "biçim değiştirme": "1432450629522948207",
    "tılsım": "1432450679343026382",
    "iksir": "1432450751766200390",
    "KSKS": "1432450788034089090",
    "Sihir tarihi": "1432450835383582892",
    "astronomi": "1432450884243030157",
    "bitki bilim": "1432450924592234536",
    "uçuş dersi": "1432450971103006730",
    "aritmansi": "1432451008751206690",
    "muggle bilimleri": "1432451032054763520",
    "kehanet": "1432451090053599343",
    "Sihirli Yaratıkların bakımı": "1432451241710981201",
    "antik rünler": "1432451296455168172",
    "cisimlenme": "1432451336787464252",
  } as Record<string, string>,

  // Maaş sistemi (rol adı → galleon miktarı, her 24 saat)
  salaryRoles: {
    "Profesör": 50,
    "Seherbaz": 40,
    "Bakanlık": 35,
    "Healer": 30,
  },

  // Seçmen Şapka soruları
  sortingQuestions: [
    "Hogwarts'a geldiğin ilk gün, kaybolmuş bir öğrenci gördüğünde ne yaparsın?",
    "Büyü dersinde en çok hangi konuyu merak edersin?",
    "Bir arkadaşın senden yardım istedi, ama bu seni tehlikeye atabilir. Ne yaparsın?",
    "Serbest zamanında Hogwarts'ta nerede bulunmayı tercih edersin?",
    "Bir sınav için yeterince çalışmadın, yarın sınav var. Ne yaparsın?",
    "Karanlık bir büyücüyle karşılaştığında ilk tepkin ne olur?",
    "Grup projesi için lider olmanı istediler. Nasıl yaklaşırsın?",
    "En çok değer verdiğin şey nedir?",
    "Bir arkadaşın kural ihlali yapıyor, bunu görüyorsun. Ne yaparsın?",
    "Hogwarts'ta bir gece dışarı çıkmak için fırsat buldun. Nereye gidersin?",
    "İçinde bulunduğun durumda bir seçim yapman gerekiyor: Cesaret mi, Zeka mı, Sadakat mi, Hırs mı?",
    "Seni en iyi tanımlayan özelliğin ne olduğunu düşünüyorsun?",
  ],

  // XP ve seviye sistemi
  xpPerMinute: 1,
  levelFormula: (level: number) => level * 100,
};
