#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <dlfcn.h>
#include <errno.h>
#include <fcntl.h>

// Targets to protect
static const char* PROTECTED_FILES[] = {
    "d3d11.dll",
    "dxgi.dll",
    "version.dll",
    "d3dcompiler_47.dll",
    NULL
};

static int is_protected(const char* path) {
    if (!path) return 0;
    
    // Check path against protected filenames
    // We check if the path ENDS with any of the protected filenames
    // to handle full paths vs relative paths.
    for (int i = 0; PROTECTED_FILES[i] != NULL; i++) {
        size_t path_len = strlen(path);
        size_t protected_len = strlen(PROTECTED_FILES[i]);
        
        if (path_len >= protected_len) {
            // Check suffix match
            if (strcasecmp(path + path_len - protected_len, PROTECTED_FILES[i]) == 0) {
                // Ensure it's a full filename match (preceded by / or is start of string)
                if (path_len == protected_len || path[path_len - protected_len - 1] == '/' || path[path_len - protected_len - 1] == '\\') {
                    return 1;
                }
            }
        }
    }
    return 0;
}

// Function pointers for original syscalls
static int (*original_unlink)(const char *pathname) = NULL;
static int (*original_unlinkat)(int dirfd, const char *pathname, int flags) = NULL;
static int (*original_rename)(const char *oldpath, const char *newpath) = NULL;
static int (*original_renameat)(int olddirfd, const char *oldpath, int newdirfd, const char *newpath) = NULL;

// --- Hooks ---

int unlink(const char *pathname) {
    if (is_protected(pathname)) {
        fprintf(stderr, "[YAGO Shield] BLOCKED unlink of protected file: %s\n", pathname);
        // Lie to the process and say it succeeded
        return 0;
    }

    if (!original_unlink) {
        original_unlink = dlsym(RTLD_NEXT, "unlink");
    }
    return original_unlink(pathname);
}

int unlinkat(int dirfd, const char *pathname, int flags) {
    if (is_protected(pathname)) {
        fprintf(stderr, "[YAGO Shield] BLOCKED unlinkat of protected file: %s\n", pathname);
        return 0;
    }

    if (!original_unlinkat) {
        original_unlinkat = dlsym(RTLD_NEXT, "unlinkat");
    }
    return original_unlinkat(dirfd, pathname, flags);
}

int rename(const char *oldpath, const char *newpath) {
    if (is_protected(oldpath)) {
        fprintf(stderr, "[YAGO Shield] BLOCKED rename of protected file: %s -> %s\n", oldpath, newpath);
        return 0;
    }

    if (!original_rename) {
        original_rename = dlsym(RTLD_NEXT, "rename");
    }
    return original_rename(oldpath, newpath);
}

int renameat(int olddirfd, const char *oldpath, int newdirfd, const char *newpath) {
    if (is_protected(oldpath)) {
        fprintf(stderr, "[YAGO Shield] BLOCKED renameat of protected file: %s -> %s\n", oldpath, newpath);
        return 0;
    }

    if (!original_renameat) {
        original_renameat = dlsym(RTLD_NEXT, "renameat");
    }
    return original_renameat(olddirfd, oldpath, newdirfd, newpath);
}

// Constructor to ensure we load early
__attribute__((constructor))
void shield_init(void) {
    // Pre-resolve symbols to avoid race conditions later?
    // Generally dlsym is thread-safe on modern Linux but good to be aware.
    original_unlink = dlsym(RTLD_NEXT, "unlink");
    original_unlinkat = dlsym(RTLD_NEXT, "unlinkat");
    original_rename = dlsym(RTLD_NEXT, "rename");
    original_renameat = dlsym(RTLD_NEXT, "renameat");
    // fprintf(stderr, "[YAGO Shield] Loaded and Active.\n");
}
