/// <reference path="./ACCModuleLoader.ts" />

type Predicative = boolean | (() => boolean);

export default Predicative;

export function testPredicative(test?: Predicative) {
  if (!test) { return true; }

  if (typeof test === "function") {
    return test();
  }

  return test;
}
