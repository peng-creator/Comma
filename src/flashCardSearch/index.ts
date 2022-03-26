import MiniSearch from 'minisearch';

type FlashCardSearchItem = {
  id: string;
};

const ids: any = {};

const flashCardMiniSearch = new MiniSearch<FlashCardSearchItem>({
  fields: ['id'], // fields to index for full-text search
  storeFields: ['id'], // fields to return with search results
  tokenize: (string) => string.split(/\W/),
});

export const addSearchItems = (items: FlashCardSearchItem[]) => {
  items = items.filter(({ id }) => {
    return ids[id] === undefined;
  });
  if (items.length > 0) {
    flashCardMiniSearch.addAll(items);
    items.forEach(({ id }) => {
      ids[id] = true;
    });
  }
};

export const searchFlashCardCollections = (keyword: string) => {
  const searchResult = flashCardMiniSearch.search(keyword, { fuzzy: 0.2 });
  console.log('searchResult of keyword:', keyword, ': ', searchResult);
  return searchResult;
};
