import { AlignTransform, type PlaitBoard } from '../plait';

export type AlignType = 'left' | 'center' | 'middle' | 'right' | 'top' | 'bottom';
export type DistributeType = 'horizontal' | 'vertical';

export function alignSelectedNodes(board: PlaitBoard, type: AlignType): void {
  switch (type) {
    case 'left':
      AlignTransform.alignLeft(board);
      break;
    case 'center':
      AlignTransform.alignHorizontalCenter(board);
      break;
    case 'middle':
      AlignTransform.alignVerticalCenter(board);
      break;
    case 'right':
      AlignTransform.alignRight(board);
      break;
    case 'top':
      AlignTransform.alignTop(board);
      break;
    case 'bottom':
      AlignTransform.alignBottom(board);
      break;
  }
}

export function distributeSelectedNodes(board: PlaitBoard, type: DistributeType): void {
  if (type === 'horizontal') {
    AlignTransform.distributeHorizontal(board);
  } else {
    AlignTransform.distributeVertical(board);
  }
}
