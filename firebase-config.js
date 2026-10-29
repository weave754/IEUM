/* ① Firebase 콘솔 → 프로젝트 설정(톱니바퀴) → 일반 → '내 앱' → 웹 앱의 SDK 설정 및 구성 → '구성'을 고르면 나오는 값을
      아래 firebaseConfig 안에 그대로 붙여 넣어요. (이 값은 공개돼도 괜찮은 값이에요. 보안은 Firestore 규칙이 지켜요.) */
export const firebaseConfig = {
  apiKey: "AIzaSyC5iwcn_R24ef02AQ-dn7tS8v-ExazrxO4",
  authDomain: "ieum-f78c8.firebaseapp.com",
  projectId: "ieum-f78c8",
  storageBucket: "ieum-f78c8.firebasestorage.app",
  messagingSenderId: "652613952322",
  appId: "1:652613952322:web:feab03174e5d27c2929edb",
};

/* ② 쓸 Gemini 모델 (앞에서부터 써 보고, 없어진 모델이면 다음 것을 써요).
      모두 결제 수단 없이 쓸 수 있는 Flash 계열이에요. 2026년 10월 기준 이름이에요. */
export const AI_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
