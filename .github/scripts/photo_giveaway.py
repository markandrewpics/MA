"""Call the private campaign dispatcher. Never print contacts, tokens or links."""
import json, os, urllib.request
secret=os.environ.get('PHOTO_ADMIN_SECRET','')
if not secret: raise SystemExit('Campaign secret not configured.')
kinds=['gallery'] if os.environ.get('PHOTO_MESSAGE_KIND')=='gallery' else ['reminder48','reminder24']
for kind in kinds:
    page=1
    while page:
        request=urllib.request.Request('https://www.markandrewboudoir.com/api/car-funnel',method='POST',headers={'Content-Type':'application/json','Authorization':'Bearer '+secret},data=json.dumps({'action':'run','kind':kind,'page':page}).encode())
        with urllib.request.urlopen(request,timeout=65) as response: result=json.load(response)
        print(kind, 'page', page, {k:result[k] for k in ['sent','skipped','review'] if k in result})
        if result.get('review'): raise SystemExit('Provider response needs review; stopped to avoid duplicate messages.')
        page=result.get('nextPage')
