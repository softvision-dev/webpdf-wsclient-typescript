package net.webpdf.codegen.names;

import java.nio.file.Path;

@SuppressWarnings("unused")
public class TypeName {

    private final String modelName;
    private final String pack;
    private final String name;

    public TypeName(String modelName) {
        String name = modelName;
        StringBuilder packageName = new StringBuilder();
        if (modelName.contains(".")) {
            String[] path = modelName.split("\\.");
            for (int i = 0; i < path.length; i++) {
                if (i != path.length - 1) {
                    if (i != 0) {
                        packageName.append(".");
                    }
                    packageName.append(path[i]);
                } else {
                    name = path[i];
                }
            }
        }
        this.modelName = modelName;
        this.pack = packageName.toString();
        this.name = name;
    }

    public TypeName(String pack, String name) {
        this.pack = pack;
        this.name = name;
        this.modelName = getPackageLocation("");
    }

    public TypeName(String modelName, String pack, String name) {
        this.modelName = modelName;
        this.pack = pack;
        this.name = name;
    }

    public String getModelName() {
        return modelName;
    }

    public String getPack() {
        return pack;
    }

    public String getName() {
        return name;
    }

    public String getPackageLocation(String basePath) {
        String path = getPackagePath(basePath);
        return path.isEmpty() ? name : path + "." + name;
    }

    public String getPackagePath(String basePath) {
        return basePath.isEmpty() ? pack :
                pack.isEmpty() ? basePath :
                        basePath + "." + pack;
    }

    public String getRootFileLocation() {
        return "./" + Path.of(pack.replaceAll("\\.", "/"))
                .toString().replaceAll("\\\\", "/") + "/" + name;
    }

    public String getRelativeFileLocation(String basePath) {
        String path = getRelativeFilePath(basePath);
        return path.isEmpty() ? name : path + "/" + name;
    }

    public String getRelativeFilePath(String basePath) {
        if (pack.equals(basePath)) {
            return ".";
        }
        Path current = Path.of(pack.replaceAll("\\.", "/"));
        Path target = Path.of(basePath.replaceAll("\\.", "/"));
        return "./" + target.relativize(current).toString().replaceAll("\\\\", "/");
    }

}
