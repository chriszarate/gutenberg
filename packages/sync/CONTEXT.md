# Sync Package: Yjs 14 Update & Suggestions Feature

## Branch

`update/yjs-beta-v14`

## Yjs 14 Upgrade

Updated yjs from `13.6.29` (npm) to `14.0.0-16` (GitHub: `github:yjs/yjs#v14.0.0-16`).

The npm-published `14.0.0-16` package is missing attribution manager exports. The GitHub tag includes them, so we install from GitHub directly.

### Breaking Changes Fixed

1. **`toDelta()` removed from `Y.Text`** — replaced with `getContent()`, which returns a lib0 Delta (linked list with `children`) instead of a Quill Delta (`ops` array). Added `lib0DeltaToQuillOps()` and `applyQuillDeltaOpsToYText()` in `packages/core-data/src/utils/crdt-blocks.ts`.

2. **`YMapEvent` renamed to `YEvent`** — updated in `src/manager.ts` and `src/suggestions/suggestion-mode-manager.ts` to use `Y.YEvent<Y.Map<unknown>>`.

3. **`AbstractType` generic constraint changed** — now requires `Delta<any, any, any, any, any>`. Updated `YMapWrap` in `packages/core-data/src/utils/crdt-utils.ts` to use `Y.AbstractType<any, any>`.

4. **`Uint8Array` type strictness** — `mergeUpdates` now expects `Uint8Array<ArrayBuffer>[]`. Added cast in `src/providers/http-polling/polling-manager.ts`.

5. **Jest module resolution** — `y-protocols` couldn't resolve `yjs` because the GitHub-installed package lacks a `dist/` folder at root. Fixed by adding `yjs` to root `devDependencies` + `overrides` in the monorepo `package.json`, and adding a `moduleNameMapper` entry in `test/unit/jest.config.js`.

## Suggestions Feature (Phase 1 Complete)

### Architecture

Uses Yjs 14's `DiffAttributionManager` for snapshot-based suggestion tracking:

- On entering suggestion mode, clone the current `Y.Doc` as a baseline.
- `createAttributionManagerFromDiff(baselineDoc, liveDoc)` tracks changes by client ID.
- Accept = discard baseline, changes become permanent.
- Reject = restore from baseline, discard changes.

### New Files

- `src/suggestions/types.ts` — `SuggestionModeState`, `AttributedChange`, `ISuggestionModeManager`, callback types.
- `src/suggestions/suggestion-mode-manager.ts` — `SuggestionModeManager` class. Methods: `start()`, `isActive()`, `getState()`, `getAttributedChanges()`, `acceptAll()`, `rejectAll()`, `destroy()`.
- `src/suggestions/attribution-utils.ts` — `cloneYDoc()`, `createSuggestionAttributionManager()`, `extractAttributedChanges()`, `restoreFromDoc()`.
- `src/suggestions/index.ts` — Public exports.

### Modified Files

- `src/config.ts` — Added `CRDT_SUGGESTION_META_MAP_KEY`, `SUGGESTION_BASELINE_KEY`, `SUGGESTION_STARTED_AT_KEY`, `SUGGESTION_STARTED_BY_KEY`.
- `src/types.ts` — Extended `SyncConfig` with `supportsSuggestions?: boolean`. Extended `SyncManager` with `getSuggestionModeManager()`.
- `src/manager.ts` — Creates `SuggestionModeManager` per document when `supportsSuggestions` is true. Added `suggestionModeManagers` Map and `getSuggestionModeManager()` method.
- `src/index.ts` — Re-exports suggestion types and classes.

### Key Yjs 14 APIs Used

- `Y.DiffAttributionManager` — Tracks changes between two Y.Doc instances.
- `Y.createAttributionManagerFromDiff(prevDoc, nextDoc)` — Creates a diff-based attribution manager.
- `Y.encodeStateAsUpdateV2()` / `Y.applyUpdateV2()` — For cloning documents.

## Remaining Phases

- **Phase 2**: Attribution-based change rendering utilities (extract insert/delete ranges with author info).
- **Phase 3**: Editor store integration and React hooks (`useSuggestionMode`, `useSuggestions`).
- **Phase 4**: UI components (suggestion mode toggle, suggestion panel, inline highlights).
- **Phase 5**: Persistence handling (ensure suggestions don't persist until accepted).
