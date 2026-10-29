import {
  PlaitBoard,
  PlaitElement,
  getSelectedElements,
  toHostPoint,
  toViewBoxPoint,
  BoardTransforms,
  PlaitPointerType,
  clearSelectedElement,
  addSelectedElement,
  Transforms,
} from '@plait/core';
import { BoardCreationMode, setCreationMode } from '@plait/common';
import {
  MindElement,
  PlaitMind,
  MindNodeComponent,
  createEmptyMind,
  MindElementShape,
  MindTransforms,
  MindPointerType,
  BranchShape,
  getNextBranchColor,
} from '@plait/mind';
import { AbstractNode } from '@plait/layouts';
import isHotkey from 'is-hotkey';

const isEnterHotkey = isHotkey('enter');

export function ensureMarkerSprite(): void {
  if (typeof document === 'undefined') return;
  const SPRITE_ID = '__speed_mindmap_markers_sprite__';
  if (document.getElementById(SPRITE_ID)) return;
}

export function renderMarkerSvgHtml(symbolId: string, size = 18): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 22 22" style="display:inline-block;vertical-align:middle;flex-shrink:0;user-select:none;pointer-events:none;"><use xlink:href="#${symbolId}" href="#${symbolId}"></use></svg>`;
}

// 补丁 MindTransforms：拦截 insertChildNode 与 insertSiblingNode，确保新节点（尤其从根节点创建的一级子节点）自动带上完整的卡片与分支样式！
let isMindTransformsPatched = false;
export function patchMindTransforms() {
  if (isMindTransformsPatched) return;
  isMindTransformsPatched = true;

  const rawInsertChildNode = MindTransforms.insertChildNode;
  MindTransforms.insertChildNode = (board: any, element: MindElement) => {
    rawInsertChildNode(board, element);

    // 检查新插入的节点，如果缺乏样式（比如从根节点刚创建的一级节点），立即补齐优雅样式！
    const selectedElements = getSelectedElements(board);
    if (selectedElements.length === 1 && MindElement.isMindElement(board, selectedElements[0])) {
      const newNode = selectedElements[0];
      const path = PlaitBoard.findPath(board, newNode);
      if (path) {
        const patch: Record<string, any> = {};
        if (PlaitMind.isMind(element)) {
          // 从根节点创建一级子节点
          const branchColor =
            getNextBranchColor(board, element) || (element as any).branchColor || '#2563eb';
          patch.shape = (element as any).shape || MindElementShape.roundRectangle;
          patch.branchColor = branchColor;
          patch.strokeColor = branchColor;
          patch.fill = '#ffffff';
          patch.strokeWidth = 2;
          patch.branchWidth = 2;
          patch.branchShape = (element as any).branchShape || BranchShape.bight;
        } else {
          // 从子节点创建子级节点
          patch.shape = (element as any).shape || MindElementShape.roundRectangle;
          patch.branchColor = (element as any).branchColor;
          patch.strokeColor = (element as any).strokeColor || (element as any).branchColor;
          patch.fill = (element as any).fill || '#ffffff';
          patch.strokeWidth = (element as any).strokeWidth || 2;
          patch.branchWidth = (element as any).branchWidth || 2;
          patch.branchShape = (element as any).branchShape || BranchShape.bight;
        }
        Transforms.setNode(board, patch, path);
      }
    }
  };

  const rawInsertSiblingNode = MindTransforms.insertSiblingNode;
  MindTransforms.insertSiblingNode = (board: any, element: MindElement) => {
    rawInsertSiblingNode(board, element);

    const selectedElements = getSelectedElements(board);
    if (selectedElements.length === 1 && MindElement.isMindElement(board, selectedElements[0])) {
      const newNode = selectedElements[0];
      const path = PlaitBoard.findPath(board, newNode);
      if (path) {
        const patch: Record<string, any> = {
          shape: (element as any).shape || MindElementShape.roundRectangle,
          branchColor: (element as any).branchColor,
          strokeColor: (element as any).strokeColor || (element as any).branchColor,
          fill: (element as any).fill || '#ffffff',
          strokeWidth: (element as any).strokeWidth || 2,
          branchWidth: (element as any).branchWidth || 2,
          branchShape: (element as any).branchShape || BranchShape.bight,
        };
        Transforms.setNode(board, patch, path);
      }
    }
  };
}

// 补丁 NodeMoreGenerator：定制折叠与添加按钮样式为紧凑圆环和内指箭头
let isNodeMoreGeneratorPatched = false;
function patchNodeMoreGenerator() {
  if (isNodeMoreGeneratorPatched) return;
  try {
    const fakeComponent = { board: {} };
    MindNodeComponent.prototype.initializeGenerator.call(fakeComponent as any);
    const NodeMoreGeneratorClass = (fakeComponent as any).nodeMoreGenerator?.constructor;
    if (NodeMoreGeneratorClass && NodeMoreGeneratorClass.prototype) {
      const BUTTON_DIAMETER = 15;
      const BUTTON_RADIUS = BUTTON_DIAMETER / 2;

      NodeMoreGeneratorClass.prototype.toggleCollapseAndAdd = function (
        center: [number, number],
        addCenter: [number, number],
        standardLeftAddCenter: [number, number],
        stroke: string,
        parentG: SVGGElement,
        isShowCollapse: boolean,
        isShowAdd: boolean,
        isShowStandardLeftAdd: boolean,
        isHitAddArea: boolean,
        isHitStandardLeftAdd: boolean,
        isShowCollapseAnimation: boolean,
        isShowAddAnimation: boolean
      ) {
        this.collapseOrAddG?.remove();
        if (!isShowCollapse && !isShowAdd && !isShowStandardLeftAdd) {
          return;
        }
        this.collapseOrAddG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        if (isShowCollapse && center) {
          const collapseG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          this.collapseOrAddG.appendChild(collapseG);
          collapseG.classList.add('collapse-button');
          if (isShowCollapseAnimation) {
            collapseG.classList.add('animated');
          }

          // 绘制紧凑背景圆
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', `${center[0]}`);
          circle.setAttribute('cy', `${center[1]}`);
          circle.setAttribute('r', `${BUTTON_RADIUS}`);
          circle.setAttribute('fill', stroke || '#2563eb');
          circle.setAttribute('stroke', stroke || '#2563eb');
          circle.setAttribute('stroke-width', '1.5');
          circle.style.cursor = 'pointer';

          // 绘制收起指示箭头 (< 箭头朝向父节点收起方向)
          const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const cx = center[0];
          const cy = center[1];
          const isLeftBranch = addCenter ? addCenter[0] < center[0] : false;
          const d = isLeftBranch
            ? `M ${cx - 1.8} ${cy - 3.8} L ${cx + 2.2} ${cy} L ${cx - 1.8} ${cy + 3.8}`
            : `M ${cx + 1.8} ${cy - 3.8} L ${cx - 2.2} ${cy} L ${cx + 1.8} ${cy + 3.8}`;

          arrowPath.setAttribute('d', d);
          arrowPath.setAttribute('fill', 'none');
          arrowPath.setAttribute('stroke', '#ffffff');
          arrowPath.setAttribute('stroke-width', '1.8');
          arrowPath.setAttribute('stroke-linecap', 'round');
          arrowPath.setAttribute('stroke-linejoin', 'round');
          arrowPath.style.pointerEvents = 'none';

          collapseG.appendChild(circle);
          collapseG.appendChild(arrowPath);
        }

        const createAddIcon = (targetG: SVGGElement, addPos: [number, number], isHit: boolean) => {
          const addG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          targetG.appendChild(addG);
          addG.classList.add('add-button');
          if (isShowAddAnimation) {
            addG.classList.add('animated');
          }

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', `${addPos[0]}`);
          circle.setAttribute('cy', `${addPos[1]}`);
          circle.setAttribute('r', `${BUTTON_RADIUS}`);
          circle.setAttribute('fill', isHit ? (stroke || '#2563eb') : '#9ca3af');
          circle.setAttribute('stroke', 'transparent');
          circle.style.cursor = 'pointer';

          // 绘制紧凑十字 (+)
          const plusPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const ax = addPos[0];
          const ay = addPos[1];
          const halfCross = 3.5;
          const d = `M ${ax - halfCross} ${ay} L ${ax + halfCross} ${ay} M ${ax} ${ay - halfCross} L ${ax} ${ay + halfCross}`;
          plusPath.setAttribute('d', d);
          plusPath.setAttribute('fill', 'none');
          plusPath.setAttribute('stroke', '#ffffff');
          plusPath.setAttribute('stroke-width', '1.8');
          plusPath.setAttribute('stroke-linecap', 'round');
          plusPath.style.pointerEvents = 'none';

          addG.appendChild(circle);
          addG.appendChild(plusPath);
        };

        if (isShowAdd && addCenter) {
          createAddIcon(this.collapseOrAddG, addCenter, isHitAddArea);
        }
        if (isShowStandardLeftAdd && standardLeftAddCenter) {
          createAddIcon(this.collapseOrAddG, standardLeftAddCenter, isHitStandardLeftAdd);
        }

        parentG.appendChild(this.collapseOrAddG);
      };
      isNodeMoreGeneratorPatched = true;
    }
  } catch (err) {
    // ignore
  }
}

export const withMindEnhance = <T extends PlaitBoard = PlaitBoard>(board: T): T => {
  patchNodeMoreGenerator();
  patchMindTransforms();

  // 1. 安全封装 getRectangle：在未挂载或初始构建阶段提供保底外包矩形，避免 console.error('mind element has not been mounted')
  const rawGetRectangle = board.getRectangle;
  board.getRectangle = (element) => {
    if (MindElement.isMindElement(board, element)) {
      if (!PlaitElement.hasMounted(element)) {
        const points = element.points || [[0, 0]];
        const width = (element as any).manualWidth || (element as any).width || 120;
        const height = (element as any).height || 40;
        return {
          x: points[0][0],
          y: points[0][1],
          width,
          height,
        };
      }
      const node = MindElement.getNode(element);
      if (!node) {
        const points = element.points || [[0, 0]];
        return {
          x: points[0][0],
          y: points[0][1],
          width: 120,
          height: 40,
        };
      }
    }
    return rawGetRectangle(element);
  };

  // 2. 实现 renderEmoji 钩子，支持渲染优先级、进度与旗帜等标记
  (board as any).renderEmoji = (container: HTMLElement, props: any) => {
    const { emojiItem, fontSize } = props;
    const size = fontSize || 18;
    const symbolId =
      typeof emojiItem === 'string'
        ? emojiItem.replace(/^#/, '')
        : emojiItem.symbolId || emojiItem.id || emojiItem.name;

    const span = document.createElement('span');
    span.className = 'mindmap-marker-item';
    span.style.display = 'inline-flex';
    span.style.alignItems = 'center';
    span.style.justifyContent = 'center';
    span.style.verticalAlign = 'middle';
    span.style.marginRight = '2px';
    span.innerHTML = renderMarkerSvgHtml(symbolId, size);
    container.appendChild(span);

    return {
      destroy: () => {
        span.remove();
      },
    };
  };

  // 3. 增强键盘快捷键：
  //    - 选中中心主题/根节点时按 Enter：新增一级子节点（带完整样式并进入编辑）！
  //    - 选中分支子节点时按 Enter：新增同级节点（带完整样式并进入编辑）！
  //    - 正在编辑文本时按 Enter：让 Slate 正常提交完成编辑！
  const { keyDown } = board;
  board.keyDown = (event: KeyboardEvent) => {
    if (isEnterHotkey(event)) {
      const selectedElements = getSelectedElements(board);
      if (selectedElements.length === 1 && MindElement.isMindElement(board, selectedElements[0])) {
        // 如果正在文本编辑模式中，让 Slate 正常处理提交，不拦截
        if (PlaitBoard.hasBeenTextEditing(board)) {
          keyDown(event);
          return;
        }

        const target = selectedElements[0];
        event.preventDefault();
        if (PlaitMind.isMind(target)) {
          // 根节点按 Enter -> 增加一级子节点！
          MindTransforms.insertChildNode(board as any, target);
        } else if (!AbstractNode.isAbstract(target)) {
          // 普通子节点按 Enter -> 增加同级节点！
          MindTransforms.insertSiblingNode(board as any, target);
        }
        return;
      }
    }
    keyDown(event);
  };

  // 4. 点击画布创建思维导图 (当处于 mind 工具时)
  const { pointerDown } = board;
  board.pointerDown = (event: PointerEvent) => {
    if (!PlaitBoard.isReadonly(board) && PlaitBoard.isPointer(board, MindPointerType.mind)) {
      event.preventDefault();
      const point = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
      const emptyMind = createEmptyMind(board, point);
      emptyMind.shape = MindElementShape.roundRectangle;
      emptyMind.fill = '#2563eb';
      emptyMind.strokeColor = '#2563eb';
      if (emptyMind.data?.topic?.children?.[0]) {
        (emptyMind.data.topic.children[0] as any).color = '#ffffff';
        (emptyMind.data.topic as any).align = 'center';
      }
      MindTransforms.insertMind(board as any, emptyMind);
      BoardTransforms.updatePointerType(board, PlaitPointerType.selection);
      setCreationMode(board, BoardCreationMode.dnd);
      clearSelectedElement(board);
      addSelectedElement(board, emptyMind);
      const wrapper = (board as any).boardWrapper;
      wrapper?.setPointer?.(PlaitPointerType.selection);
      wrapper?.emit?.('change', {});
      wrapper?.emit?.('selection:change', { selected: [emptyMind] });
      return;
    }
    pointerDown(event);
  };

  return board;
};
