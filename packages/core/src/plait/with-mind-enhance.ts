import {
  PlaitBoard,
  BoardTransforms,
  PlaitPointerType,
  toHostPoint,
  toViewBoxPoint,
  getSelectedElements,
  clearSelectedElement,
  addSelectedElement,
  type PlaitPlugin,
} from '@plait/core';
import {
  MindElement,
  PlaitMind,
  MindNodeComponent,
  MindTransforms,
  MindPointerType,
  MindElementShape,
  editTopic,
} from '@plait/mind';
import { MindLayoutType } from '@plait/layouts';
import isHotkey from 'is-hotkey';

const isEnterHotkey = isHotkey('enter');
const isTabHotkey = isHotkey('tab');
const isSpaceHotkey = isHotkey('space');

export function ensureMarkerSprite(): void {
  if (typeof document === 'undefined') return;
  const SPRITE_ID = '__speed_mindmap_markers_sprite__';
  if (document.getElementById(SPRITE_ID)) return;
}

export function renderMarkerSvgHtml(symbolId: string, size = 18): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 22 22" style="display:inline-block;vertical-align:middle;flex-shrink:0;user-select:none;pointer-events:none;"><use xlink:href="#${symbolId}" href="#${symbolId}"></use></svg>`;
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
          // 判断是左侧还是右侧分支 (根据 addCenter 与 center 的相对 X 坐标)
          const isLeftBranch = addCenter ? addCenter[0] < center[0] : false;
          const d = isLeftBranch
            ? `M ${cx - 1.8} ${cy - 3.8} L ${cx + 2.2} ${cy} L ${cx - 1.8} ${cy + 3.8}` // 指向右侧父节点
            : `M ${cx + 1.8} ${cy - 3.8} L ${cx - 2.2} ${cy} L ${cx + 1.8} ${cy + 3.8}`; // 指向左侧父节点

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

export const withMindEnhance: PlaitPlugin = (board: PlaitBoard) => {
  patchNodeMoreGenerator();

  // 1. 实现 renderEmoji 钩子，支持渲染优先级、进度与旗帜等标记
  board.renderEmoji = (container: HTMLElement, props: any) => {
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

  // 2. 接管画布点击创建思维导图（彻底解决灰底与未居中问题）
  const { pointerDown } = board;
  board.pointerDown = (event: PointerEvent) => {
    const isMindPointer = PlaitBoard.isPointer(board, MindPointerType.mind);
    if (!PlaitBoard.isReadonly(board) && isMindPointer) {
      event.preventDefault();
      const point = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
      const width = 110;
      const height = 42;
      const newMind: any = {
        id: `mind-${Date.now()}`,
        type: 'mind',
        points: [[point[0] - width / 2, point[1] - height / 2]],
        shape: MindElementShape.roundRectangle,
        fill: '#2563eb',
        strokeColor: '#2563eb',
        layout: MindLayoutType.standard,
        data: {
          topic: {
            children: [{ text: '思维导图', color: '#ffffff' }],
            align: 'center',
          },
        },
        children: [],
      };
      MindTransforms.insertMind(board, newMind);
      BoardTransforms.updatePointerType(board, PlaitPointerType.selection);
      clearSelectedElement(board);
      addSelectedElement(board, [newMind]);
      const wrapper = (board as any).boardWrapper;
      wrapper?.emit?.('change', {});
      wrapper?.emit?.('selection:change', { selected: [newMind] });
      return;
    }
    pointerDown(event);
  };

  // 3. 增强键盘事件：输入中按 Enter 退出保存（杜绝 removeChild 报错）；选中态按 Enter/Tab 增删节点
  const { keyDown } = board;
  board.keyDown = (event: KeyboardEvent) => {
    // 3.1 用户如果在富文本 contenteditable 中正在打字：
    const isTyping =
      (event.target as HTMLElement)?.isContentEditable ||
      Boolean((event.target as HTMLElement)?.closest?.('[contenteditable="true"]'));
    if (isTyping) {
      if (isEnterHotkey(event) && !event.shiftKey) {
        event.preventDefault();
        (event.target as HTMLElement)?.blur();
        return;
      }
      keyDown(event);
      return;
    }

    // 3.2 用户在画布选中态（非打字中）：
    const selectedElements = getSelectedElements(board);
    const isSingleMind =
      selectedElements.length === 1 && MindElement.isMindElement(board, selectedElements[0]);
    if (isSingleMind && !PlaitBoard.isReadonly(board)) {
      const target = selectedElements[0];
      // Enter 键：根节点或分支节点直接添加子/同级节点
      if (isEnterHotkey(event)) {
        event.preventDefault();
        if (PlaitMind.isMind(target)) {
          MindTransforms.insertChildNode(board, target);
        } else {
          MindTransforms.insertSiblingNode(board, target);
        }
        return;
      }
      // Tab 键：添加子节点
      if (isTabHotkey(event)) {
        event.preventDefault();
        MindTransforms.insertChildNode(board, target);
        return;
      }
      // Space 键：进入编辑态
      if (isSpaceHotkey(event)) {
        event.preventDefault();
        editTopic(target);
        return;
      }
    }

    keyDown(event);
  };

  return board;
};
