// CSS side-effect import(`import "./globals.css"`)를 위한 ambient 선언.
// Next 빌드는 자체 로더로 처리하지만, `tsc --noEmit` 단독 타입체크에는
// *.css 모듈 선언이 없어 TS2882가 발생하므로 여기서 보강한다.
declare module "*.css";
