import { expect, test } from "@oclif/test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import {
  fetchClones,
  fetchViews,
  mergeClonesAndViews,
  saveToDB
} from "../src/helper";

describe("helper", () => {
  test.it("mergeClonesAndViews", () => {
    const clones = [
      {
        clones: [
          {
            count: 1,
            repo: "a",
            types: "clones"
          },
          {
            count: 2,
            repo: "b",
            types: "clones"
          }
        ]
      }
    ];
    const views = [
      {
        views: [
          {
            count: 1,
            repo: "a",
            types: "views"
          },
          {
            count: 2,
            repo: "b",
            types: "views"
          }
        ]
      }
    ];

    const allData = mergeClonesAndViews(clones, views);
    expect(allData).to.eql([
      {
        count: 1,
        repo: "a",
        types: "clones"
      },
      {
        count: 2,
        repo: "b",
        types: "clones"
      },
      {
        count: 1,
        repo: "a",
        types: "views"
      },
      {
        count: 2,
        repo: "b",
        types: "views"
      }
    ]);
  });

  test
    .nock("https://api.github.com", (api) =>
      api
        .get("/repos/hyperjumptech/export-github-clones-views/traffic/clones")
        .reply(200, {
          clones: [
            {
              timestamp: "2016-10-10T00:00:00Z",
              count: 2,
              uniques: 1
            },
            {
              timestamp: "2016-10-11T00:00:00Z",
              count: 17,
              uniques: 16
            }
          ]
        })
    )
    .it("fetch clones", async () => {
      const clones = await fetchClones(
        ["hyperjumptech/export-github-clones-views"],
        "username",
        "password"
      );

      expect(clones).to.eql([
        {
          clones: [
            {
              timestamp: "2016-10-10T00:00:00Z",
              count: 2,
              uniques: 1,
              types: "clones",
              repo: "hyperjumptech/export-github-clones-views"
            },
            {
              timestamp: "2016-10-11T00:00:00Z",
              count: 17,
              uniques: 16,
              types: "clones",
              repo: "hyperjumptech/export-github-clones-views"
            }
          ]
        }
      ]);
    });

  test
    .nock("https://api.github.com", (api) =>
      api
        .get("/repos/hyperjumptech/export-github-clones-views/traffic/views")
        .reply(200, {
          views: [
            {
              timestamp: "2016-10-10T00:00:00Z",
              count: 2,
              uniques: 1
            },
            {
              timestamp: "2016-10-11T00:00:00Z",
              count: 17,
              uniques: 16
            }
          ]
        })
    )
    .it("fetch views", async () => {
      const views = await fetchViews(
        ["hyperjumptech/export-github-clones-views"],
        "username",
        "password"
      );

      expect(views).to.eql([
        {
          views: [
            {
              timestamp: "2016-10-10T00:00:00Z",
              count: 2,
              uniques: 1,
              types: "views",
              repo: "hyperjumptech/export-github-clones-views"
            },
            {
              timestamp: "2016-10-11T00:00:00Z",
              count: 17,
              uniques: 16,
              types: "views",
              repo: "hyperjumptech/export-github-clones-views"
            }
          ]
        }
      ]);
    });

  test.it("save to db", async () => {
    const mongod = new MongoMemoryServer();

    const uri = await mongod.getUri();

    const clones = [
      {
        clones: [
          {
            timestamp: "2016-10-10T00:00:00Z",
            count: 2,
            uniques: 1,
            types: "clones",
            repo: "hyperjumptech/export-github-clones-views"
          },
          {
            timestamp: "2016-10-11T00:00:00Z",
            count: 17,
            uniques: 16,
            types: "clones",
            repo: "hyperjumptech/export-github-clones-views"
          }
        ]
      }
    ];
    const views = [
      {
        views: [
          {
            timestamp: "2016-10-10T00:00:00Z",
            count: 2,
            uniques: 1,
            types: "views",
            repo: "hyperjumptech/export-github-clones-views"
          },
          {
            timestamp: "2016-10-11T00:00:00Z",
            count: 17,
            uniques: 16,
            types: "views",
            repo: "hyperjumptech/export-github-clones-views"
          }
        ]
      }
    ];

    await saveToDB({ dbURI: uri, clones, views });

    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const count = await new Promise((resolve) => {
      client.connect(async () => {
        const count = await client.db().collection("stats").countDocuments();
        resolve(count);
      });
    });

    expect(count).to.eql(4);

    await client.close();
    await mongod.stop();
  });
});
