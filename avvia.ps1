# Serve questa cartella su http://localhost:8000 e apre il mazzo nel browser.
#
# Serve perche' aprire slides/main.html con un doppio clic (file://) non basta:
# Chrome considera cross-origin le immagini caricate da file://, e almeno la
# slide del folding tesseract usa una texture. Con un server locale il problema
# non si pone. Non serve niente di installato: HttpListener fa parte di .NET,
# che c'e' su qualunque Windows.
#
# Per fermarlo: Ctrl+C, oppure chiudi la finestra.

$porta = 8000
$radice = $PSScriptRoot
$paginaIniziale = "/slides/main.html"

$tipi = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".txt"  = "text/plain; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".ico"  = "image/x-icon"
    ".mp4"  = "video/mp4"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"  = "font/ttf"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$porta/")
try {
    $listener.Start()
} catch {
    Write-Host "Non riesco ad aprire la porta $porta." -ForegroundColor Red
    Write-Host "Probabilmente c'e' gia' qualcosa in ascolto: cambia `$porta in cima a questo file."
    Read-Host "Premi Invio per chiudere"
    exit 1
}

Write-Host ""
Write-Host "  Mazzo servito da: $radice"
Write-Host "  Indirizzo:        http://localhost:$porta$paginaIniziale"
Write-Host ""
Write-Host "  Lascia aperta questa finestra durante la presentazione."
Write-Host "  Per fermare: Ctrl+C."
Write-Host ""

Start-Process "http://localhost:$porta$paginaIniziale"

while ($listener.IsListening) {
    try {
        $contesto = $listener.GetContext()
    } catch {
        break
    }
    $richiesta = $contesto.Request
    $risposta = $contesto.Response

    $percorso = [System.Uri]::UnescapeDataString($richiesta.Url.AbsolutePath)
    if ($percorso -eq "/") { $percorso = $paginaIniziale }
    $percorso = $percorso -replace "/", "\"
    $file = Join-Path $radice $percorso.TrimStart("\")

    # Nessuna richiesta puo' uscire dalla cartella servita.
    $pieno = [System.IO.Path]::GetFullPath($file)
    $baseRadice = [System.IO.Path]::GetFullPath($radice)
    if (-not $pieno.StartsWith($baseRadice, [System.StringComparison]::OrdinalIgnoreCase)) {
        $risposta.StatusCode = 403
        $risposta.Close()
        continue
    }

    if (Test-Path -LiteralPath $pieno -PathType Leaf) {
        $estensione = [System.IO.Path]::GetExtension($pieno).ToLower()
        $tipo = $tipi[$estensione]
        if (-not $tipo) { $tipo = "application/octet-stream" }
        $byte = [System.IO.File]::ReadAllBytes($pieno)
        $risposta.ContentType = $tipo
        $risposta.ContentLength64 = $byte.Length
        $risposta.AddHeader("Cache-Control", "no-store")
        $risposta.OutputStream.Write($byte, 0, $byte.Length)
    } else {
        $risposta.StatusCode = 404
    }
    $risposta.Close()
}

$listener.Stop()
