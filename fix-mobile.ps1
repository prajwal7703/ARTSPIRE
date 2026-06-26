$files = Get-ChildItem -Path ".\src" -Recurse -Include "*.jsx","*.tsx"

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $changed = $false

  if ($content -match 'const isMobile\s*=\s*\(\)\s*=>\s*window\.innerWidth\s*<\s*\d+;') {
    $content = $content -replace 'const isMobile\s*=\s*\(\)\s*=>\s*window\.innerWidth\s*<\s*\d+;\s*\n?', ''
    $changed = $true
  }

  if ($content -match 'const mobile\s*=\s*isMobile\(\);') {
    $content = $content -replace '\s*const mobile\s*=\s*isMobile\(\);\s*\n?', ''
    $changed = $true
  }

  if ($changed -and $content -notmatch 'setMobile') {
    $hookCode = "`n  const [mobile, setMobile] = useState(window.innerWidth < 768);`n  useEffect(() => {`n    const __mfn = () => setMobile(window.innerWidth < 768);`n    window.addEventListener('resize', __mfn);`n    return () => window.removeEventListener('resize', __mfn);`n  }, []);`n"

    if ($content -match 'const artistId\s*=') {
      $content = $content -replace '(const artistId\s*=.*;\s*\n)', "`$1$hookCode"
    } elseif ($content -match 'const userId\s*=') {
      $content = $content -replace '(const userId\s*=.*;\s*\n)', "`$1$hookCode"
    } elseif ($content -match 'const account\s*=') {
      $content = $content -replace '(const account\s*=.*;\s*\n)', "`$1$hookCode"
    } else {
      $content = $content -replace '(export default function \w+\(\)\s*\{)', "`$1$hookCode"
    }
  }

  if ($changed) {
    Set-Content $file.FullName $content -NoNewline
    Write-Host "Fixed: $($file.FullName)"
  }
}

Write-Host "Done!"
