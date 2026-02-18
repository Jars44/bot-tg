declare module "@mateoaranda/jikanjs" {
  interface JikanAnime {
    title: string;
    type: string;
    aired: {
      prop: {
        from: {
          year: number;
        };
      };
    };
    score: number;
    synopsis: string;
    url: string;
    images: {
      jpg: {
        image_url: string;
      };
    };
  }

  interface JikanSearchResult {
    data: JikanAnime[];
  }

  function search(type: string, query: string): Promise<JikanSearchResult>;

  export default {
    search,
  };
}
