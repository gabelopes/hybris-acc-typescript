/// <reference path="./ACCModuleLoader.ts" />

import Predicative from "./Predicative";

type Autoload<T> = keyof T | AutoloadConfiguration<T>;

export default Autoload;

export type AutoloadConfiguration<T> = {
  method: keyof T;
  condition: Predicative;
  otherwise?: keyof T;
};
