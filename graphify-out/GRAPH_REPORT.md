# Graph Report - SIDAKOTA  (2026-05-13)

## Corpus Check
- 87 files · ~131,525 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 239 nodes · 210 edges · 11 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]

## God Nodes (most connected - your core abstractions)
1. `setForm()` - 12 edges
2. `createClient()` - 10 edges
3. `Number()` - 9 edges
4. `useCrud()` - 5 edges
5. `createAdminClient()` - 5 edges
6. `useTenant()` - 5 edges
7. `OlahragaPage()` - 4 edges
8. `createServerSupabaseClient()` - 4 edges
9. `set()` - 3 edges
10. `handleFormSubmit()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `set()` --calls--> `setForm()`  [INFERRED]
  src\app\admin\ekonomi\potensi\page.tsx → src\app\admin\pemerintahan\profil\page.tsx
- `load()` --calls--> `createClient()`  [INFERRED]
  src\app\admin\ekonomi\sarana\page.tsx → src\lib\supabase\client.ts
- `set()` --calls--> `setForm()`  [INFERRED]
  src\app\admin\ekonomi\sektor-usaha\page.tsx → src\app\admin\pemerintahan\profil\page.tsx
- `set()` --calls--> `setForm()`  [INFERRED]
  src\app\admin\infrastruktur\sanitasi\page.tsx → src\app\admin\pemerintahan\profil\page.tsx
- `handleFormSubmit()` --calls--> `Number()`  [INFERRED]
  src\app\admin\infrastruktur\sanitasi\page.tsx → src\app\admin\peta\page.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (11): SanitasiSection(), handleLayerSubmit(), handlePoiSubmit(), Number(), String(), handleSubmit(), confirmDelete(), handleCreate() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (11): AuthProvider(), useAuth(), logActivity(), load(), set(), fetchRef(), set(), createClient() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (7): set(), set(), setVal(), set(), set(), set(), setForm()

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (9): useCrud(), OlahragaPage(), useInfraSports(), useRefJenisSaranaOlahraga(), PartisipasiPage(), handleFormSubmit(), SanitasiPage(), set() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.31
Nodes (5): generateCaptcha(), getRecordStatus(), handleReset(), handleSearch(), isSudahBayar()

### Community 6 - "Community 6"
Cohesion: 0.39
Nodes (5): createAdminClient(), createServerSupabaseClient(), DELETE(), PATCH(), POST()

### Community 7 - "Community 7"
Cohesion: 0.4
Nodes (2): handleFotoChange(), set()

### Community 8 - "Community 8"
Cohesion: 0.47
Nodes (3): generateCaptcha(), handleReset(), handleSearch()

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (3): handleFormSubmit(), load(), set()

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (2): normalizeRisk(), normalizeRiskLabel()

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (2): handleSubmit(), String()

## Knowledge Gaps
- **Thin community `Community 7`** (6 nodes): `handleDelete()`, `handleFormSubmit()`, `handleFotoChange()`, `handleSubmit()`, `set()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (5 nodes): `normalizeRisk()`, `normalizeRiskLabel()`, `Pagination()`, `StatCard()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (4 nodes): `handleDelete()`, `handleSubmit()`, `String()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `setForm()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 7`, `Community 11`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 1` to `Community 11`, `Community 6`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `Number()` connect `Community 0` to `Community 11`, `Community 3`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `setForm()` (e.g. with `set()` and `set()`) actually correct?**
  _`setForm()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `createClient()` (e.g. with `load()` and `load()`) actually correct?**
  _`createClient()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `Number()` (e.g. with `handleFormSubmit()` and `handleSubmit()`) actually correct?**
  _`Number()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `useCrud()` (e.g. with `SanitasiPage()` and `PartisipasiPage()`) actually correct?**
  _`useCrud()` has 4 INFERRED edges - model-reasoned connections that need verification._