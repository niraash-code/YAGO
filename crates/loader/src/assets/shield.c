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
    
    // 1. Check if the filename matches our protected list
    int name_match = 0;
    const char* filename = NULL;
    for (int i = 0; PROTECTED_FILES[i] != NULL; i++) {
        size_t path_len = strlen(path);
        size_t protected_len = strlen(PROTECTED_FILES[i]);
        
        if (path_len >= protected_len) {
            if (strcasecmp(path + path_len - protected_len, PROTECTED_FILES[i]) == 0) {
                if (path_len == protected_len || path[path_len - protected_len - 1] == '/' || path[path_len - protected_len - 1] == '\\') {
                    name_match = 1;
                    filename = PROTECTED_FILES[i];
                    break;
                }
            }
        }
    }

    if (!name_match) return 0;

    // 2. PATH AWARENESS: Only protect if inside YAGO_PROTECT_PATH
    const char* protect_root = getenv("YAGO_PROTECT_PATH");
    if (!protect_root || strlen(protect_root) == 0) return 0; // If not set, protect nothing (failsafe)

    // Resolve the full path of the file we are checking
    char real_path[4096];
    memset(real_path, 0, 4096);
    if (realpath(path, real_path) == NULL) {
        // If file doesn't exist yet or is otherwise invalid, 
        // fall back to string check on the input path
        if (protect_root && strstr(path, protect_root) != NULL) return 1;
        return 0;
    }

    // Check if the real path starts with the protected root
    if (strncasecmp(real_path, protect_root, strlen(protect_root)) == 0) {
        return 1;
    }

    // fprintf(stderr, "[YAGO Shield] Allowing access to unprotected path: %s\n", real_path);
    return 0;
}

#include <stdarg.h>

// Function pointers for original syscalls
static int (*original_unlink)(const char *pathname) = NULL;
static int (*original_unlinkat)(int dirfd, const char *pathname, int flags) = NULL;
static int (*original_rename)(const char *oldpath, const char *newpath) = NULL;
static int (*original_renameat)(int olddirfd, const char *oldpath, int newdirfd, const char *newpath) = NULL;
static int (*original_open)(const char *pathname, int flags, ...) = NULL;
static int (*original_openat)(int dirfd, const char *pathname, int flags, ...) = NULL;

// --- Hooks ---

int open(const char *pathname, int flags, ...) {
    mode_t mode = 0;
    if (flags & O_CREAT || flags & O_TMPFILE) {
        va_list args;
        va_start(args, flags);
        mode = va_arg(args, mode_t);
        va_end(args);
    }

    if (is_protected(pathname) && (flags & O_TRUNC || flags & O_WRONLY || flags & O_RDWR)) {
        fprintf(stderr, "[YAGO Shield] BLOCKED write/truncate access to protected file: %s\n", pathname);
        errno = EACCES;
        return -1;
    }

    if (!original_open) {
        original_open = dlsym(RTLD_NEXT, "open");
    }
    return original_open(pathname, flags, mode);
}

int openat(int dirfd, const char *pathname, int flags, ...) {
    mode_t mode = 0;
    if (flags & O_CREAT || flags & O_TMPFILE) {
        va_list args;
        va_start(args, flags);
        mode = va_arg(args, mode_t);
        va_end(args);
    }

    if (is_protected(pathname) && (flags & O_TRUNC || flags & O_WRONLY || flags & O_RDWR)) {
        fprintf(stderr, "[YAGO Shield] BLOCKED write/truncate access to protected file: %s\n", pathname);
        errno = EACCES;
        return -1;
    }

    if (!original_openat) {
        original_openat = dlsym(RTLD_NEXT, "openat");
    }
    return original_openat(dirfd, pathname, flags, mode);
}

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
