import fs from 'node:fs';

const content = fs.readFileSync('/Volumes/ykxDrive/gitee/speed-board/raw-shapes.svg', 'utf-8');

const groupsConfig = [
  { key: 'basic', title: '基础图形' },
  { key: 'flowchart', title: '流程图' },
  { key: 'DSL', title: 'Smart' },
  { key: 'UML', title: 'UML' },
  { key: 'ER', title: 'ER 图' }
];

const library = [];

for (let i = 0; i < groupsConfig.length; i++) {
  const g = groupsConfig[i];
  const startIdx = content.indexOf(`data-group="${g.key}"`);
  if (startIdx === -1) continue;
  const nextIdx = i < groupsConfig.length - 1 ? content.indexOf(`data-group="${groupsConfig[i + 1].key}"`) : content.length;
  const chunk = content.slice(startIdx, nextIdx);
  const matches = [...chunk.matchAll(/<g stroke="#595959" fill="transparent"[^>]+data-name="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g)];

  const shapes = matches.map(m => {
    const id = m[1];
    const inner = m[2];
    const title = (inner.match(/<title>([^<]+)<\/title>/) || [])[1] || id;
    let svgBody = inner
      .replace(/<title>[^<]*<\/title>/g, '')
      .replace(/<path fill="transparent" stroke="none" d="M2,0l28,0[\s\S]*?<\/path>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      id,
      name: title,
      group: g.key,
      groupName: g.title,
      svgBody
    };
  });
  library.push({
    key: g.key,
    title: g.title,
    shapes
  });
}

const fileHeader = `/**
 * SpeedBoard 全量图形库定义
 * 包含 5 大核心分组，共 93 个矢量图形
 * 1. 基础图形 (basic): 22 个
 * 2. 流程图 (flowchart): 28 个
 * 3. Smart (DSL): 4 个
 * 4. UML (UML): 30 个
 * 5. ER 图 (ER): 9 个
 */

export interface ShapeDefinition {
  id: string
  name: string
  group: 'basic' | 'flowchart' | 'DSL' | 'UML' | 'ER'
  groupName: string
  svgBody: string
}

export interface ShapeGroup {
  key: 'basic' | 'flowchart' | 'DSL' | 'UML' | 'ER'
  title: string
  shapes: ShapeDefinition[]
}
`;

const fileBody = `export const SHAPE_GROUPS: ShapeGroup[] = ${JSON.stringify(library, null, 2)};\n\n` +
`export const ALL_SHAPES: ShapeDefinition[] = SHAPE_GROUPS.flatMap(g => g.shapes);\n\n` +
`export const SHAPE_MAP: Record<string, ShapeDefinition> = Object.fromEntries(ALL_SHAPES.map(s => [s.id, s]));\n\n` +
`export function getShapeById(id: string): ShapeDefinition | undefined {\n  return SHAPE_MAP[id];\n}\n\n` +
`/**\n * 渲染图形图标 (用于选择器网格展示)\n */\n` +
`export function getShapeIconSvg(shape: ShapeDefinition): string {\n` +
`  const body = shape.svgBody.replace(/#595959/g, 'currentColor');\n` +
`  return \`<svg viewBox="0 0 32 32" width="22" height="22" style="overflow:visible;display:block;"><g stroke="currentColor" stroke-width="1.5" fill="none">\${body}</g></svg>\`;\n` +
`}\n\n` +
`/**\n * 渲染画布图元内部 SVG 内容\n */\n` +
`export function renderShapeCanvasSvg(shape: ShapeDefinition, options: {\n` +
`  fill?: string\n` +
`  stroke?: string\n` +
`  strokeWidth?: number\n` +
`  strokeDasharray?: string\n` +
`} = {}): string {\n` +
`  const fill = options.fill ?? '#eff6ff';\n` +
`  const stroke = options.stroke ?? '#3b82f6';\n` +
`  const strokeWidth = options.strokeWidth ?? 2;\n` +
`  const dash = options.strokeDasharray && options.strokeDasharray !== 'none' ? options.strokeDasharray : '';\n` +
`  const body = shape.svgBody\n` +
`    .replace(/#595959/g, stroke)\n` +
`    .replace(/<path/g, '<path vector-effect="non-scaling-stroke"')\n` +
`    .replace(/<circle/g, '<circle vector-effect="non-scaling-stroke"')\n` +
`    .replace(/<rect/g, '<rect vector-effect="non-scaling-stroke"')\n` +
`    .replace(/<polygon/g, '<polygon vector-effect="non-scaling-stroke"');\n` +
`  const dashAttr = dash ? \` stroke-dasharray="\${dash}"\` : '';\n` +
`  return \`<svg viewBox="0 0 32 32" width="100%" height="100%" preserveAspectRatio="none" style="overflow:visible;display:block;"><g stroke="\${stroke}" stroke-width="\${strokeWidth}"\${dashAttr} fill="\${fill}">\${body}</g></svg>\`;\n` +
`}\n`;

fs.writeFileSync('/Volumes/ykxDrive/gitee/speed-board/packages/vue3-antd/src/data/shapeLibrary.ts', fileHeader + '\n' + fileBody);
console.log('Successfully generated packages/vue3-antd/src/data/shapeLibrary.ts!');
