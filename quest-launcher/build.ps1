param(
    [string]$AndroidSdk = $env:ANDROID_HOME,
    [string]$JavaHome = $env:JAVA_HOME
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (!$AndroidSdk -or !$JavaHome) { throw 'Provide -AndroidSdk and -JavaHome, or set ANDROID_HOME and JAVA_HOME.' }
$sdk = (Resolve-Path -LiteralPath $AndroidSdk).Path
$jdk = (Resolve-Path -LiteralPath $JavaHome).Path
$buildTools = Join-Path $sdk 'build-tools/34.0.0'
$androidJar = Join-Path $sdk 'platforms/android-34/android.jar'
foreach ($tool in @("$buildTools/aapt2.exe", "$buildTools/d8.bat", "$buildTools/zipalign.exe", "$buildTools/apksigner.bat", "$jdk/bin/javac.exe", "$jdk/bin/jar.exe", "$jdk/bin/keytool.exe", $androidJar)) {
    if (!(Test-Path -LiteralPath $tool)) { throw "Missing Android build tool: $tool" }
}
$root = Split-Path $PSScriptRoot -Parent
$output = Join-Path $root '.for-ai-local/quest-launcher'
$classes = Join-Path $output 'classes'
$dex = Join-Path $output 'dex'
$keyDirectory = Join-Path $env:LOCALAPPDATA 'ImmersiveVideoPlayer'
$keystore = Join-Path $keyDirectory 'quest-launcher.keystore'
New-Item -ItemType Directory -Path $output, $classes, $dex, $keyDirectory -Force | Out-Null
$apk = Join-Path $output 'ImmersiveVideoPlayer-Quest.apk'
$previousJava = $env:JAVA_HOME
function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Executable failed with exit code $LASTEXITCODE" }
}
try {
    $env:JAVA_HOME = $jdk
    Invoke-Checked "$buildTools/aapt2.exe" @('compile', '--dir', "$PSScriptRoot/res", '-o', "$output/resources.zip")
    Invoke-Checked "$buildTools/aapt2.exe" @('link', '-o', "$output/unsigned.apk", '-I', $androidJar, '--manifest', "$PSScriptRoot/AndroidManifest.xml", "$output/resources.zip")
    Invoke-Checked "$jdk/bin/javac.exe" @('--release', '8', '-classpath', $androidJar, '-d', $classes, "$PSScriptRoot/src/org/immersivevideoplayer/questlauncher/MainActivity.java")
    Invoke-Checked "$buildTools/d8.bat" @('--lib', $androidJar, '--min-api', '29', '--output', $dex, "$classes/org/immersivevideoplayer/questlauncher/MainActivity.class")
    Invoke-Checked "$jdk/bin/jar.exe" @('uf', "$output/unsigned.apk", '-C', $dex, 'classes.dex')
    Invoke-Checked "$buildTools/zipalign.exe" @('-f', '4', "$output/unsigned.apk", "$output/aligned.apk")
    if (!(Test-Path -LiteralPath $keystore)) {
        Invoke-Checked "$jdk/bin/keytool.exe" @('-genkeypair', '-keystore', $keystore, '-storepass', 'android', '-keypass', 'android', '-alias', 'quest-launcher', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Immersive Video Player Local Development')
    }
    Invoke-Checked "$buildTools/apksigner.bat" @('sign', '--ks', $keystore, '--ks-key-alias', 'quest-launcher', '--ks-pass', 'pass:android', '--key-pass', 'pass:android', '--out', $apk, "$output/aligned.apk")
    Invoke-Checked "$buildTools/apksigner.bat" @('verify', '--verbose', '--print-certs', $apk)
    Invoke-Checked "$buildTools/zipalign.exe" @('-c', '4', $apk)
    Invoke-Checked "$buildTools/aapt2.exe" @('dump', 'badging', $apk)
    Get-FileHash -LiteralPath $apk -Algorithm SHA256
    Write-Output "APK: $apk"
} finally {
    $env:JAVA_HOME = $previousJava
}
