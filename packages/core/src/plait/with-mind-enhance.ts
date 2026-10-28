import {
  PlaitBoard,
  getSelectedElements,
  type PlaitPlugin,
} from '@plait/core';
import {
  MindElement,
  MindNodeComponent,
  editTopic,
  WithMindPluginKey,
} from '@plait/mind';
import isHotkey from 'is-hotkey';

const isEnterHotkey = isHotkey('enter');

export function ensureMarkerSprite(): void {
  if (typeof document === 'undefined') return;
  const SPRITE_ID = '__speed_mindmap_markers_sprite__';
  if (document.getElementById(SPRITE_ID)) return;
  // If the shared sprite is in document, return
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

  // 2. 增强键盘事件：Enter 键进入编辑模式
  const { keyDown } = board;
  board.keyDown = (event: KeyboardEvent) => {
    if (isEnterHotkey(event)) {
      const selectedElements = getSelectedElements(board);
      if (selectedElements.length === 1 && MindElement.isMindElement(board, selectedElements[0])) {
        // 如果当前不在编辑文字，Enter 触发进入文字编辑模式
        if (!PlaitBoard.hasBeenTextEditing(board)) {
          event.preventDefault();
          editTopic(selectedElements[0]);
          return;
        }
      }
    }
    keyDown(event);
  };

  return board;
};
