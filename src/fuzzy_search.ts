export function fuzzySearch(items: string[], query: string): string[] {
    const lowercaseQuery = query.toLowerCase();
    return items.filter(item => {
      const lowercaseItem = item.toLowerCase();
      let i = 0, n = -1, l;
      for (; l = lowercaseQuery[i++] ;) {
        if (!~(n = lowercaseItem.indexOf(l, n + 1))) return false;
      }
      return true;
    });
  }