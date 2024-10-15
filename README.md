# memory

To install dependencies:

```bash
bun i
```

To run:

```bash
bun eval
```

Roadmap:

- [x] `ingest(text: string)`
- [x] `search(query: string, filters?: { tags?: Array<string | { not: string }> }[])`
- [ ] Support filters in search
- [ ] Support for ingesting image and video
- [ ] Support for any OpenAI-compatible model
- [x] Support graph memory (see brainstorm example below)

_Mockup:_
<img width="958" alt="image" src="https://github.com/user-attachments/assets/c86c9e6e-805f-484e-8f8d-a8e359dab8d7">

_Implementation (spot the falsehood):_
<img width="943" alt="image" src="https://github.com/user-attachments/assets/1317c12f-d0d1-4922-8e8a-f56f72c06ebc">
