# SKKU Avatar Viewer

2D 아바타 게임 뷰어 - PixiJS, WebSocket, Protobuf 기반

## 기능

1. **아바타 생성** - 서버로부터 받은 데이터로 아바타 생성 (스프라이트 URL 지원)
2. **아바타 이동** - 부드러운 보간 이동 및 자동 애니메이션 전환 (stand ↔ walk)
3. **오브젝트 생성** - 게임 오브젝트 생성 및 관리 (스프라이트 URL 지원)
4. **오브젝트 취득** - 아바타가 오브젝트를 습득
5. **스프라이트 로딩** - CloudFront URL로부터 동적 스프라이트 로딩 및 캐싱

## 프로젝트 구조

```
src/
├── core/
│   └── GameApplication.ts      # 메인 게임 애플리케이션
├── entities/
│   ├── Avatar.ts               # 아바타 클래스 (스프라이트 URL 지원)
│   └── GameObject.ts           # 게임 오브젝트 클래스 (스프라이트 URL 지원)
├── network/
│   └── WebSocketManager.ts    # WebSocket 통신 관리
├── proto/
│   ├── game.proto              # Protobuf 스키마 정의
│   └── ProtobufHandler.ts     # Protobuf 인코딩/디코딩
├── ui/
│   └── AdminPanel.ts           # 어드민 패널 UI
├── utils/
│   ├── SpriteManager.ts        # 스프라이트 로딩 및 캐싱
│   └── EasterEggHandler.ts     # 이스터에그 입력 처리
└── main.ts                     # 엔트리 포인트
```

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## 사용 방법

### WebSocket 서버 연결

`src/main.ts`에서 게임 서버 URL을 설정:

```typescript
const GAME_SERVER_URL = 'ws://localhost:8080';
```

### 개발 모드 테스트

서버 없이 로컬 테스트가 가능합니다. `src/main.ts`에서 테스트 코드 활성화:

```typescript
if (import.meta.env.DEV) {
  game.testCreateAvatar('player1', x, y);
  game.testCreateObject('item1', x, y, 'coin');
  game.testMoveAvatar('player1', newX, newY);
  game.testPickupObject('player1', 'item1');
}
```

### 🎮 어드민 패널 (이스터에그)

게임 실행 중 **Z 키를 누른 상태로 화면을 3번 클릭**하면 어드민 패널이 나타납니다.

**기능:**
- 👤 **아바타 생성** - 원하는 위치에 아바타 생성
- 🏃 **아바타 이동** - 아바타를 특정 좌표로 이동
- 📦 **오브젝트 생성** - 게임 오브젝트 생성
- ✋ **오브젝트 취득** - 아바타가 오브젝트 획득
- ⚡ **빠른 생성** - 랜덤 위치에 아바타/오브젝트 생성

**단축키:**
- `Z + 3 클릭` - 어드민 패널 토글
- `ESC` - 어드민 패널 닫기

어드민 패널을 사용하면 게임 서버 없이도 모든 게임 이벤트를 테스트할 수 있습니다.

### 🖼️ 스프라이트 URL 구조

게임 서버에서 전송되는 아바타 및 오브젝트 생성 이벤트에는 스프라이트 URL이 포함될 수 있습니다.

**아바타 스프라이트 URL 형식:**
```
www.{cloudfront_domain}.com/{avatar_id}/{action}
```

**지원되는 액션:**
- `stand` - 정지 상태
- `walk` - 걷기 상태
- `run` - 달리기 상태

**예시:**
```
www.d1234abcd.cloudfront.net/player001/stand
www.d1234abcd.cloudfront.net/player001/walk
www.d1234abcd.cloudfront.net/player001/run
```

**동작 방식:**
1. 아바타 생성 시 `spriteUrl`에 베이스 URL 제공 (예: `www.domain.com/avatar_id`)
2. `SpriteManager`가 자동으로 모든 액션 스프라이트 로딩 (stand, walk, run)
3. 아바타 이동 시 자동으로 애니메이션 전환:
   - 정지 상태 → `stand` 스프라이트
   - 이동 중 → `walk` 스프라이트
4. 스프라이트 로딩 실패 시 기본 텍스처로 폴백

**오브젝트 스프라이트:**
```
www.{cloudfront_domain}.com/objects/{object_name}.png
```

**어드민 패널에서 테스트:**
어드민 패널의 "Sprite URL" 필드에 베이스 URL을 입력하여 스프라이트 로딩 테스트 가능

## Protobuf 메시지 구조

### MessageType
- `AVATAR_CREATE` - 아바타 생성
- `AVATAR_MOVE` - 아바타 이동
- `OBJECT_CREATE` - 오브젝트 생성
- `OBJECT_PICKUP` - 오브젝트 취득

### 메시지 예시

```protobuf
// 아바타 데이터 (스프라이트 URL 포함)
message AvatarData {
  string id = 1;
  float x = 2;
  float y = 3;
  string name = 4;
  optional Velocity velocity = 5;
  optional string spriteUrl = 6; // 스프라이트 베이스 URL
}

// 오브젝트 데이터 (스프라이트 URL 포함)
message GameObjectData {
  string id = 1;
  float x = 2;
  float y = 3;
  string type = 4;
  optional string spriteUrl = 5; // 스프라이트 URL
}

// 게임 메시지 래퍼
message GameMessage {
  MessageType type = 1;
  oneof payload {
    AvatarData avatarData = 2;
    GameObjectData objectData = 3;
    MovementData movementData = 4;
    PickupData pickupData = 5;
  }
}
```

## 클래스 설명

### GameApplication
메인 게임 애플리케이션 클래스. PixiJS 초기화, WebSocket 연결, 게임 루프 관리

**주요 메서드:**
- `init()` - 게임 초기화
- `createAvatar(data)` - 아바타 생성
- `moveAvatar(id, x, y)` - 아바타 이동
- `createObject(data)` - 오브젝트 생성
- `pickupObject(avatarId, objectId)` - 오브젝트 취득
- `destroy()` - 게임 정리

### Avatar
아바타 엔티티 클래스. 스프라이트와 데이터 관리, 자동 애니메이션 전환

**주요 메서드:**
- `moveTo(x, y)` - 목표 위치 설정
- `update(deltaTime)` - 프레임마다 위치 업데이트 및 애니메이션 자동 전환
- `setPosition(x, y)` - 즉시 위치 변경
- `setAction(action)` - 수동 애니메이션 변경 (stand, walk, run)
- `pickupObject(objectId)` - 오브젝트 습득
- `hasSpriteSet()` - 스프라이트 로딩 여부 확인

**특징:**
- 스프라이트 URL 제공 시 자동으로 stand, walk, run 애니메이션 로딩
- 이동 중/정지 상태에 따라 자동 애니메이션 전환
- 스프라이트 로딩 실패 시 기본 텍스처로 폴백

### GameObject
게임 오브젝트 엔티티 클래스. 스프라이트와 데이터 관리

**주요 메서드:**
- `updatePosition(x, y)` - 위치 업데이트
- `destroy()` - 오브젝트 제거

**특징:**
- 스프라이트 URL 제공 시 자동 로딩
- 비율 유지하며 크기 조정

### WebSocketManager
WebSocket 통신 관리 클래스. 자동 재연결 지원

**주요 메서드:**
- `connect()` - 서버 연결
- `on(messageType, handler)` - 메시지 핸들러 등록
- `off(messageType, handler)` - 메시지 핸들러 제거
- `send(message)` - 메시지 전송
- `disconnect()` - 연결 종료

### ProtobufHandler
Protobuf 메시지 인코딩/디코딩 클래스

**주요 메서드:**
- `loadSchema(protoPath)` - .proto 파일 로드
- `loadSchemaFromJSON(schemaJson)` - JSON 스키마 로드
- `encode(message)` - 메시지 인코딩
- `decode(buffer)` - 메시지 디코딩

### SpriteManager
스프라이트 로딩 및 캐싱 관리 싱글톤 클래스

**주요 메서드:**
- `loadSpriteSet(baseUrl)` - 아바타 스프라이트 세트 로딩 (stand, walk, run)
- `getActionTexture(spriteSet, action)` - 특정 액션 텍스처 가져오기
- `createSprite(spriteSet, defaultAction)` - 스프라이트 생성
- `clearCache(baseUrl)` - 특정 URL 캐시 삭제
- `getCacheStats()` - 캐시 통계 조회

**특징:**
- 싱글톤 패턴으로 전역 스프라이트 캐시 관리
- 중복 로딩 방지 (Promise 기반 로딩 큐)
- CloudFront URL 파싱 및 자동 액션별 URL 생성
- 로딩 실패 시 graceful degradation

## 기술 스택

- **PixiJS v8.14.0** - 2D 렌더링 엔진
- **WebSocket** - 실시간 통신
- **Protobuf** - 메시지 직렬화
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구

## 브라우저 지원

- Chrome/Edge (최신)
- Firefox (최신)
- Safari (최신)

## 라이선스

MIT
