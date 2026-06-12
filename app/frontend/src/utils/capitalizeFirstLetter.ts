/** UI表示用ラベルだけを整えるため、先頭1文字のみ大文字化して残りの文字列は保持する。 */
export const capitalizeFirstLetter = (value: string): string => {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};
