package net.webpdf.codegen.extension.index;

import net.webpdf.codegen.extension.WebPDFExtension;

import java.util.*;

@SuppressWarnings("unused")
public class Index implements Iterable<IndexEntry> {

    private final String modelPackage;
    private final Map<String, IndexEntry> names = new HashMap<>();
    private final List<IndexEntry> orderedEntries = new ArrayList<>();

    public Index(String modelPackage) {
        this.modelPackage = modelPackage;
    }

    public Index add(IndexEntry... indexEntries) {
        for (IndexEntry indexEntry : indexEntries) {
            boolean alreadyContained = false;
            if (contains(indexEntry)) {
                continue;
            }
            for (String exportedName : indexEntry.getExportedTypeNames()) {
                names.put(exportedName, indexEntry);
            }
            orderedEntries.add(indexEntry);
        }
        return this;
    }

    public IndexEntry get(String exportedName) {
        return names.get(exportedName);
    }

    public boolean contains(IndexEntry indexEntry) {
        for (String exportedName : indexEntry.getExportedTypeNames()) {
            if (names.containsKey(exportedName)) {
                IndexEntry entry = names.get(exportedName);
                if (!entry.getPackageLocation().equals(indexEntry.getPackageLocation())) {
                    throw new IllegalArgumentException(
                            entry.getPackageLocation() + " and " + indexEntry.getPackageLocation() +
                            " collide for name " + exportedName + "!");
                }
                return true;
            }
        }
        return false;
    }

    public Index sort() {
        List<IndexEntry> orderedEntries = new ArrayList<>();
        for (IndexEntry entry : this) {
            addOrdered(orderedEntries, entry, modelPackage);
        }
        this.orderedEntries.clear();
        this.orderedEntries.addAll(orderedEntries);
        return this;
    }

    private void addOrdered(List<IndexEntry> orderedList, IndexEntry entry, String modelPackage) {
        if (orderedList.contains(entry)) {
            return;
        }
        WebPDFExtension extensions = WebPDFExtension.determineExtension(entry.getModel(), modelPackage);
        String parentName = extensions.getParentClassName();
        String extendsName = extensions.getExtends();
        if (names.containsKey(parentName)) {
            addOrdered(orderedList, names.get(parentName), modelPackage);
        }
        if (names.containsKey(extendsName)) {
            addOrdered(orderedList, names.get(extendsName), modelPackage);
        }

        orderedList.add(entry);
    }

    public List<IndexEntry> getOrderedEntries() {
        return orderedEntries;
    }

    @Override
    public Iterator<IndexEntry> iterator() {
        return orderedEntries.iterator();
    }

}
