export function bannerSnapshot(store) {
  return {
    heroImage: store.heroImage || '',
    heroPositionX: Number(store.heroPositionX ?? 50),
    heroPositionY: Number(store.heroPositionY ?? 50),
  };
}

export function bannerChanged(previous, next) {
  return JSON.stringify(bannerSnapshot(previous)) !== JSON.stringify(bannerSnapshot(next));
}
