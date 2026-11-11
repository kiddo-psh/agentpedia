import conventional from "@commitlint/config-conventional";

const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // `content:` is for article and kit changes under content/.
    "type-enum": [2, "always", [...conventional.rules["type-enum"][2], "content"]],
  },
};

export default config;
