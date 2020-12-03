import { expect, test } from "@oclif/test";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import cmd = require("../src");

describe("export-github-clones-views", () => {
  test
    .stderr()
    .do(() => cmd.run([]))
    .catch((error) => {
      expect(error.message).to.match(/Missing required flag/);
    })
    .it("shows error when no flags nor arguments");

  test
    .stderr()
    .do(() => cmd.run(["hyperjumptech/export-github-clones-views"]))
    .catch((error) => {
      expect(error.message).to.match(/Missing required flag/);
    })
    .it("shows error when no username or password");

  test
    .stderr()
    .do(() => cmd.run(["-u", "username", "-p", "password"]))
    .catch((error) => {
      expect(error.message).to.match(/Please provide at least 1 repository/);
    })
    .it("shows error when no repository");

  test
    .stdout()
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
    .do(() =>
      cmd.run([
        "-u",
        "username",
        "-p",
        "password",
        "hyperjumptech/export-github-clones-views"
      ])
    )
    .it("shows fetch results in console", (ctx) => {
      expect(JSON.parse(ctx.stdout)).to.eql([
        {
          timestamp: "2016-10-10T00:00:00Z",
          count: 2,
          uniques: 1,
          repo: "hyperjumptech/export-github-clones-views",
          types: "clones"
        },
        {
          timestamp: "2016-10-11T00:00:00Z",
          count: 17,
          uniques: 16,
          repo: "hyperjumptech/export-github-clones-views",
          types: "clones"
        },
        {
          timestamp: "2016-10-10T00:00:00Z",
          count: 2,
          uniques: 1,
          repo: "hyperjumptech/export-github-clones-views",
          types: "views"
        },
        {
          timestamp: "2016-10-11T00:00:00Z",
          count: 17,
          uniques: 16,
          repo: "hyperjumptech/export-github-clones-views",
          types: "views"
        }
      ]);
    });

  test
    .stdout()
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
    .add("mongod", async () => {
      const mongod = new MongoMemoryServer();
      const uri = await mongod.getUri();
      const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      return {
        server: mongod,
        client,
        uri
      };
    })
    .do(async (context) => {
      await cmd.run([
        "-u",
        "username",
        "-p",
        "password",
        "-m",
        context.mongod.uri,
        "hyperjumptech/export-github-clones-views"
      ]);
    })
    .do(async (context) => {
      const count = await new Promise((resolve) => {
        context.mongod.client.connect(async () => {
          const count = await context.mongod.client
            .db()
            .collection("stats")
            .countDocuments();
          resolve(count);
        });
      });

      expect(count).to.eql(4);
    })
    .finally(async (context) => {
      await context.mongod.client.close();
      await context.mongod.server.stop();
    })
    .it("save result to db when -m flag exists");
});
