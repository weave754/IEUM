/* ① Firebase 콘솔 → 프로젝트 설정(톱니바퀴) → 일반 → '내 앱' → 웹 앱의 SDK 설정 및 구성 → '구성'을 고르면 나오는 값을
      아래 firebaseConfig 안에 그대로 붙여 넣어요. (이 값은 공개돼도 괜찮은 값이에요. 보안은 Firestore 규칙이 지켜요.) */
export const firebaseConfig = {
  apiKey: "여기에-apiKey-붙여넣기",
  authDomain: "내프로젝트.firebaseapp.com",
  projectId: "내프로젝트",
  storageBucket: "내프로젝트.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

/* ② 쓸 Gemini 모델 (앞에서부터 써 보고, 없어진 모델이면 다음 것을 써요).
      모두 결제 수단 없이 쓸 수 있는 Flash 계열이에요. 2026년 10월 기준 이름이에요. */
export const AI_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
