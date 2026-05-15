import { useLayoutEffect } from "react";
import { useSharedValue } from "react-native-reanimated";
import { runOnUIAsync } from "react-native-worklets";

const WORKLET_CLASS_FACTORY_SUFFIX = "__classFactory";

type WorkletClassConstructor = {
  new (...args: any[]): object;
  name: string;
};

type WorkletClassFactory<TClass extends WorkletClassConstructor> = () => TClass;

function getWorkletClassFactory<TClass extends WorkletClassConstructor>(
  WorkletClass: TClass
) {
  const factoryKey = `${WorkletClass.name}${WORKLET_CLASS_FACTORY_SUFFIX}`;

  return (
    WorkletClass as unknown as Record<string, WorkletClassFactory<TClass>>
  )[factoryKey];
}

export default function useWorkletClass<TClass extends WorkletClassConstructor>(
  WorkletClass: TClass,
  ...constructorArgs: ConstructorParameters<TClass>
) {
  const instance = useSharedValue<InstanceType<TClass> | null>(null);
  const className = WorkletClass.name;
  const classFactory = getWorkletClassFactory(WorkletClass);

  useLayoutEffect(
    function init() {
      if (!classFactory) {
        throw new Error(`${className} should be marked as a worklet class`);
      }

      runOnUIAsync(() => {
        "worklet";

        const Class = classFactory();
        instance.set(new Class(...constructorArgs) as InstanceType<TClass>);
      });
    },
    [classFactory, className, instance, ...constructorArgs]
  );

  return instance;
}
