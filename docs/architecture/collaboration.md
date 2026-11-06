# 并发控制与协同演进

本章节介绍 SpeedBoard 在数据持久化、并发控制以及未来多人协同演进方案。

---

## 1. 当前模式：乐观并发控制 (OCC)

当前 SpeedBoard 默认采用**乐观并发版本控制（Optimistic Concurrency Control）**机制：
- 文档保存时携带版本戳（Revision CAS）；
- 杜绝数据后写入无感知覆盖先写入（Last-Write-Wins 灾难）；
- 当检测到远端已被他人更新时，提示用户保存冲突并可选择另存为或比对合并。

---

## 2. 多人实时协同演进路线 (CRDT / Yjs)

若业务需要高并发、多人同时在线白板与多光标显示，底层 Plait 引擎的数据结构具备非常优雅的演进能力：

1. **原子不可变数据模型**：
   Plait 画布由 `children` 树状数组构成，对画布的每一次修改（平移、变色、拖动控制点、文字打字）均抽象为严格的 `Operation`（如 `insert_node`, `remove_node`, `set_node`）；
2. **CRDT 映射与同步**：
   通过接入 **Yjs**（`Y.Doc` 中的 `Y.Array` / `Y.Map`）或 **Loro**，可以将 Plait 的原子操作映射为协同操作序列；
3. **多人光标与感知层 (Awareness)**：
   借助 WebSocket 或 WebRTC 传输 Awareness 状态，在画布中渲染协作成员的光标位置、名字气泡与选中高亮框。
