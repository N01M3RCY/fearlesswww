export const CONFIG = {
  guildId: process.env.DISCORD_GUILD_ID ?? "",
  clientId: process.env.DISCORD_CLIENT_ID ?? "",
  token: process.env.DISCORD_BOT_TOKEN ?? "",

  // Bina rolleri
  houses: {
    gryffindor: process.env.ROLE_GRYFFINDOR ?? "Gryffindor",
    slytherin: process.env.ROLE_SLYTHERIN ?? "Slytherin",
    ravenclaw: process.env.ROLE_RAVENCLAW ?? "Ravenclaw",
    hufflepuff: process.env.ROLE_HUFFLEPUFF ?? "Hufflepuff",
  },

  // Özel kanal ID'leri (admin panelden ayarlanabilir)
  channels: {
    sortingHat: process.env.CHANNEL_SORTING_HAT ?? "",
    applications: process.env.CHANNEL_APPLICATIONS ?? "",
    characterIntro: process.env.CHANNEL_CHARACTER_INTRO ?? "",
    announcements: process.env.CHANNEL_ANNOUNCEMENTS ?? "",
    housePoints: process.env.CHANNEL_HOUSE_POINTS ?? "",
  },

  // Rol ID'leri
  roles: {
    professor: process.env.ROLE_PROFESSOR ?? "Profesör",
    auror: process.env.ROLE_AUROR ?? "Seherbaz",
    azkaban: process.env.ROLE_AZKABAN ?? "Azkaban",
    warn3: process.env.ROLE_WARN3 ?? "warn3",
    ministry: process.env.ROLE_MINISTRY ?? "Bakanlık",
    firstYear: process.env.ROLE_1ST_YEAR ?? "1. Sınıf",
    secondYear: process.env.ROLE_2ND_YEAR ?? "2. Sınıf",
    thirdYear: process.env.ROLE_3RD_YEAR ?? "3. Sınıf",
    fourthYear: process.env.ROLE_4TH_YEAR ?? "4. Sınıf",
    fifthYear: process.env.ROLE_5TH_YEAR ?? "5. Sınıf",
    sixthYear: process.env.ROLE_6TH_YEAR ?? "6. Sınıf",
    seventhYear: process.env.ROLE_7TH_YEAR ?? "7. Sınıf",
    safkan: process.env.ROLE_SAFKAN ?? "Safkan",
    melez: process.env.ROLE_MELEZ ?? "Melez",
    muggleDogu: process.env.ROLE_MUGGLE ?? "Muggle Doğumlu",
    cadi: process.env.ROLE_CADI ?? "Cadı",
    buyucu: process.env.ROLE_BUYUCU ?? "Büyücü",
  },

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
