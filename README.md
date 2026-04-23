# HitchMap

Mobilna aplikacja do planowania i dokumentowania podrozy autostopowych. Projekt laczy mape, geolokalizacje, lokalna baze SQLite, synchronizacje z backendem oraz funkcje grupowe, dzieki ktorym kilka osob moze sledzic wspolna trase.

## Stos technologiczny

- Expo / React Native
- TypeScript
- Express
- PostgreSQL
- SQLite

## Najwazniejsze funkcje

- wyszukiwanie miasta lub kraju i przejscie do wybranego obszaru mapy,
- przegladanie punktow autostopowych na mapie,
- dodawanie nowych wpisow z ocena i komentarzem,
- synchronizacja danych pomiedzy backendem i lokalna baza SQLite,
- filtrowanie lokalnej bazy po krajach,
- pobieranie map offline,
- tworzenie grup, dolaczanie do grup i wspoldzielenie lokalizacji.

## Struktura projektu

- `app/` - glowny ekran aplikacji i routing Expo
- `features/map/components/` - komponenty UI mapy, kart i drawerow
- `features/map/hooks/` - logika synchronizacji, grup, wyszukiwania i viewportu
- `lib/` - SQLite, narzedzia mapy i dane krajow
- `backend/` - API Express i warstwa PostgreSQL
- `tests/` - testy logiki frontendu
- `backend/tests/` - testy backendu

## Wymagania

- Node.js
- npm
- PostgreSQL
- Expo Go albo emulator Androida

## Konfiguracja

Frontend korzysta z pliku `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

Na telefonie wpisz adres IP komputera w tej samej sieci Wi-Fi.  
Na emulatorze Androida zwykle mozna uzyc:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

Backend korzysta z `backend/.env`:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=mapapp
DB_PASSWORD=twoje_haslo
DB_PORT=5432
HOST=0.0.0.0
PORT=3000
```

## Uruchomienie projektu

### 1. Przygotowanie bazy danych

Utworz baze:

```sql
CREATE DATABASE mapapp;
```

Wgraj schemat:

```bash
psql -U postgres -d mapapp -f backend/schema.sql
```

### 2. Uruchomienie backendu

```bash
cd backend
npm install
npm test
npm start
```

Backend powinien odpowiadac pod:

```text
http://localhost:3000/health
```

### 3. Uruchomienie frontendu

W glownym katalogu projektu:

```bash
npm install
npm test
npm run lint
npx expo start
```

Na Androidzie mozna tez uzyc:

```bash
npm run android
```

## Testy

Frontend:

```bash
npm test
npm run lint
npx tsc --noEmit
```

Backend:

```bash
cd backend
npm test
```

## API backendu

Najwazniejsze endpointy:

- `GET /health`
- `GET /spots`
- `GET /spots/visible`
- `GET /spots/offline`
- `GET /sync/full`
- `GET /sync/changes`
- `POST /spots/reviews`
- `POST /groups/create`
- `POST /groups/join`
- `POST /groups/leave`
- `POST /groups/location`
- `POST /groups/rename`
- `POST /groups/remove-member`
- `GET /groups`
- `GET /groups/:code`

## Ograniczenia

- brak pelnej autoryzacji i kont uzytkownikow,
- mapy offline korzystaja z prostokatnych bounds, nie z dokladnych granic panstw,
- duze paczki offline wymagaja ostroznego doboru zoomu,
- lokalna SQLite jest kopia robocza i synchronizuje sie z backendem.

## Status projektu

Projekt zostal przygotowany jako aplikacja inzynierska laczaca:

- aplikacje mobilna,
- backend API,
- PostgreSQL,
- lokalne cache danych,
- tryb offline,
- funkcje grupowe i wspoldzielenie lokalizacji.
